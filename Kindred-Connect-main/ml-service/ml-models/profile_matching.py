"""
profile_matching.py

Compatibility scoring + bulk matching for Kindred Connect.

This module provides:
- `calculate_compatibility(elder, orphan)` -> float in [0, 1]
- `auto_match_all(elders, orphans)` -> greedy one-orphan-once assignments
- `matcher.score_pairs()` used by POST /match-profiles (existing endpoint)
"""

from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional, Set

from pathlib import Path

import csv

import numpy as np


def _as_list(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(x) for x in value if x is not None and str(x).strip()]
    if isinstance(value, str):
        # Allow comma-separated strings.
        parts = [p.strip() for p in value.split(",")]
        return [p for p in parts if p]
    return []


def _maybe_number(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        # Allows numeric strings.
        num = float(value)
        return num if num >= 0 else None
    except (TypeError, ValueError):
        return None


def _jaccard(set_a: Set[str], set_b: Set[str]) -> float:
    if not set_a and not set_b:
        return 0.0
    if not set_a or not set_b:
        return 0.0
    intersection = len(set_a & set_b)
    union = len(set_a) + len(set_b) - intersection
    return (intersection / union) if union > 0 else 0.0


def _norm_comm(comm: Any) -> Optional[str]:
    if comm is None:
        return None
    c = str(comm).strip().lower()
    if not c:
        return None

    # Normalize to generator-style tokens.
    if c in {"talkative", "verbal"}:
        return "verbal"
    if c in {"reserved", "non-verbal", "nonverbal"}:
        return "non-verbal"
    if c in {"balanced", "mixed"}:
        return "mixed"
    if c in {"introvert", "extrovert", "ambivert"}:
        # Not communication; keep for personality path.
        return c
    return c


def _extract_profile_features(profile: Dict[str, Any]) -> Dict[str, Any]:
    # IDs: Firestore docs usually provide `id` as doc id.
    pid = profile.get("id") or profile.get("elderId") or profile.get("orphanId")

    interests = set(_as_list(profile.get("hobbies") or profile.get("interests")))
    languages = set(_as_list(profile.get("languages") or profile.get("language")))

    emotional_tokens = set(
        _as_list(profile.get("emotional_needs") or profile.get("emotional_state"))
    )

    personality = profile.get("personality") or profile.get("personalityType") or profile.get("personality_type")
    personality = str(personality).strip().lower() if personality is not None else None

    communication = (
        profile.get("communication")
        or profile.get("communicationStyle")
        or profile.get("communication_style")
        or profile.get("communicationMode")
    )
    communication = _norm_comm(communication)

    availability = _maybe_number(
        profile.get("availability")
        or profile.get("availability_slots")
        or profile.get("availabilitySlots")
        or profile.get("availability_score")
    )

    age = _maybe_number(profile.get("age"))

    attachment_style = (
        profile.get("attachment_style")
        or profile.get("attachmentStyle")
        or profile.get("attachment")
    )
    attachment_style = (
        str(attachment_style).strip().lower() if attachment_style is not None else None
    )

    health_condition = (
        profile.get("health_condition")
        or profile.get("healthCondition")
        or profile.get("elder_health_condition")
        or profile.get("elderHealthCondition")
    )
    health_condition = (
        str(health_condition).strip().lower() if health_condition is not None else None
    )

    trauma_level = (
        profile.get("traumaLevel")
        or profile.get("trauma_level")
        or profile.get("orphan_trauma_level")
    )
    patience_level = (
        profile.get("patienceLevel")
        or profile.get("patience_level")
        or profile.get("elder_patience_level")
    )

    trauma_level = str(trauma_level).strip().lower() if trauma_level is not None else None
    patience_level = str(patience_level).strip().lower() if patience_level is not None else None

    # Pick a single token for ML feature engineering.
    allowed_emotional_states = [
        "calm",
        "anxious",
        "sad",
        "happy",
        "neutral",
        "irritated",
        "stable",
    ]
    provided_state = profile.get("emotional_state") or profile.get("emotionalState")
    provided_state = (
        str(provided_state).strip().lower() if provided_state is not None else None
    )
    if provided_state in allowed_emotional_states:
        emotional_state = provided_state
    else:
        emotional_state = next((t for t in allowed_emotional_states if t in emotional_tokens), None)
        emotional_state = emotional_state if emotional_state is not None else "neutral"

    return {
        "id": pid,
        "age": age,
        "interests": interests,
        "languages": languages,
        "emotional_tokens": emotional_tokens,
        "emotional_state": emotional_state,
        "personality": personality,
        "communication": communication,
        "availability": availability,
        "attachment_style": attachment_style,
        "health_condition": health_condition,
        "trauma_level": trauma_level,
        "patience_level": patience_level,
    }


def _personality_match(e_personality: Optional[str], o_personality: Optional[str]) -> float:
    if not e_personality or not o_personality:
        return 0.0
    if e_personality == o_personality:
        return 1.0
    # Ambivert is treated as compatible with either introvert or extrovert.
    if "ambivert" in {e_personality, o_personality}:
        return 0.5
    return 0.0


def _emotional_compatibility(ender: Dict[str, Any], orphan: Dict[str, Any]) -> float:
    # Matches the dataset generator logic in `scripts/generate_dataset.py`.
    # The ML dataset uses a single emotional state per profile, so we reduce the
    # profile's emotional token set to a single `emotional_state` token.
    o_state = orphan.get("emotional_state") or "neutral"
    e_state = ender.get("emotional_state") or "neutral"

    if o_state == e_state:
        return 1.0
    if "stable" in {o_state, e_state}:
        return 0.7
    if "anxious" in {o_state, e_state} and "calm" in {o_state, e_state}:
        return 0.8
    return 0.4


def _communication_match(ender: Dict[str, Any], orphan: Dict[str, Any]) -> float:
    c_e = ender.get("communication")
    c_o = orphan.get("communication")
    if not c_e or not c_o:
        return 0.5
    if c_e == c_o:
        return 1.0
    if "mixed" in {c_e, c_o}:
        return 0.75
    if (c_e == "verbal" and c_o == "non-verbal") or (c_o == "verbal" and c_e == "non-verbal"):
        return 0.25
    return 0.5


def _availability_overlap(ender: Dict[str, Any], orphan: Dict[str, Any]) -> float:
    a_e = ender.get("availability")
    a_o = orphan.get("availability")
    if a_e is None or a_o is None or a_e <= 0 or a_o <= 0:
        return 0.0
    mn = min(a_e, a_o)
    mx = max(a_e, a_o)
    return (mn / mx) if mx > 0 else 0.0


def _support_compatibility(ender: Dict[str, Any], orphan: Dict[str, Any]) -> float:
    # Based on dataset generator mapping.
    trauma_map = {"none": 0.0, "mild": 1.0, "moderate": 2.0, "severe": 3.0}
    patience_map = {"low": 1.0, "medium": 2.0, "high": 3.0}

    t = orphan.get("trauma_level")
    p = ender.get("patience_level")
    if t is None or p is None:
        return 0.0

    if t not in trauma_map or p not in patience_map:
        return 0.0

    t_val = trauma_map[t]
    p_val = patience_map[p]

    if p_val >= t_val:
        return 1.0
    if p_val == t_val - 1:
        return 0.5
    return 0.0


def _attachment_compatibility(ender: Dict[str, Any], orphan: Dict[str, Any]) -> float:
    # Matches dataset generator logic in `scripts/generate_dataset.py`.
    a1 = orphan.get("attachment_style")
    a2 = ender.get("attachment_style")
    if not a1 or not a2:
        return 0.5

    if a1 == a2:
        return 1.0
    if "secure" in {a1, a2}:
        return 0.8
    if "anxious" in {a1, a2} and "avoidant" in {a1, a2}:
        return 0.2
    return 0.5


def _health_factor(ender: Dict[str, Any]) -> float:
    # Matches `health_factor()` in `scripts/generate_dataset.py`.
    return {"good": 1.0, "moderate": 0.5, "critical": 0.2}.get(
        ender.get("health_condition"), 0.5
    )


def _clamp01(x: float) -> float:
    if x < 0.0:
        return 0.0
    if x > 1.0:
        return 1.0
    return float(x)


class LinearRegressor:
    """
    NumPy-only ridge-style regressor trained from `dataset.csv`.

    This avoids scikit-learn installation issues (common on Win32 / older GCC).
    """

    def __init__(self, weights: np.ndarray, bias: float, mu: np.ndarray, sigma: np.ndarray):
        self.weights = weights
        self.bias = bias
        self.mu = mu
        self.sigma = sigma

    def predict(self, X_rows: List[List[float]] | np.ndarray) -> np.ndarray:
        X = np.asarray(X_rows, dtype=float)
        sigma = self.sigma.copy()
        sigma[sigma == 0] = 1.0
        Xs = (X - self.mu) / sigma
        return Xs @ self.weights + float(self.bias)


_ML_MODEL: Optional[LinearRegressor] = None


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _train_ml_model_from_csv() -> Optional[LinearRegressor]:
    # expected: .../ml-service/dataset/dataset.csv
    dataset_path = Path(__file__).resolve().parents[1] / "dataset" / "dataset.csv"
    if not dataset_path.exists():
        print(f"[kindred-ml] Training skipped: no dataset at {dataset_path}", flush=True)
        return None

    print(f"[kindred-ml] Training started: {dataset_path}", flush=True)

    with dataset_path.open("r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    if not rows or "compatibility_score" not in (rows[0] or {}):
        print(
            "[kindred-ml] Training skipped: empty CSV or missing compatibility_score",
            flush=True,
        )
        return None

    # Column set produced by `scripts/generate_dataset.py`
    # We convert elder_health_condition -> health_factor inline.
    health_map = {"good": 1.0, "moderate": 0.5, "critical": 0.2}

    X_list: List[List[float]] = []
    y_list: List[float] = []

    for r in rows:
        y = _safe_float(r.get("compatibility_score"))
        if not (0.0 <= y <= 1.0):
            continue

        health_cond = (r.get("elder_health_condition") or "").strip().lower()
        health_factor = health_map.get(health_cond, 0.5)

        x = [
            _safe_float(r.get("age_gap")),
            _safe_float(r.get("personality_match")),
            _safe_float(r.get("emotional_compatibility")),
            _safe_float(r.get("attachment_compatibility")),
            _safe_float(r.get("interest_similarity")),
            _safe_float(r.get("communication_match")),
            _safe_float(r.get("availability_overlap")),
            _safe_float(r.get("support_compatibility")),
            _safe_float(r.get("language_match")),
            float(health_factor),
        ]
        X_list.append(x)
        y_list.append(y)

    if len(X_list) < 10:
        print(
            f"[kindred-ml] Training skipped: need ≥10 valid rows, got {len(X_list)}",
            flush=True,
        )
        return None

    X = np.asarray(X_list, dtype=float)
    y = np.asarray(y_list, dtype=float)

    # Standardize for stable linear solve
    mu = X.mean(axis=0)
    sigma = X.std(axis=0)
    sigma[sigma == 0] = 1.0
    Xs = (X - mu) / sigma

    # Ridge regression with bias term in closed form
    ones = np.ones((Xs.shape[0], 1), dtype=float)
    Xb = np.hstack([Xs, ones])
    lam = 1e-2
    I = np.eye(Xb.shape[1], dtype=float)
    I[-1, -1] = 0.0  # don't regularize bias
    w = np.linalg.solve(Xb.T @ Xb + lam * I, Xb.T @ y)

    weights = w[:-1]
    bias = w[-1]
    print(
        f"[kindred-ml] Training completed: ridge model fit on {len(X_list)} rows "
        f"({X.shape[1]} features)",
        flush=True,
    )
    return LinearRegressor(weights=weights, bias=bias, mu=mu, sigma=sigma)


try:
    _ML_MODEL = _train_ml_model_from_csv()
except Exception as exc:
    print(
        f"[kindred-ml] Training failed ({exc!r}); using deterministic fallback scorer",
        flush=True,
    )
    _ML_MODEL = None


def _language_match(ender: Dict[str, Any], orphan: Dict[str, Any]) -> float:
    # Spec: 1 if same else 0. With sets, treat any overlap as "same".
    e_lang = ender.get("languages") or set()
    o_lang = orphan.get("languages") or set()
    if not e_lang or not o_lang:
        return 0.0
    return 1.0 if (e_lang & o_lang) else 0.0


def calculate_compatibility(elder: Dict[str, Any], orphan: Dict[str, Any]) -> float:
    """
    Weighted compatibility score in [0, 1].

    score = (
      0.25 * interest_similarity +
      0.15 * personality_match +
      0.15 * emotional_compatibility +
      0.10 * communication_match +
      0.10 * availability_overlap +
      0.15 * support_compatibility +
      0.10 * language_match
    )
    """
    # Ensures we use the trained ML model when available.
    ender_f = _extract_profile_features(elder)
    orphan_f = _extract_profile_features(orphan)
    return _score_features(ender_f, orphan_f)


def _ml_feature_vector(ender_f: Dict[str, Any], orphan_f: Dict[str, Any]) -> List[float]:
    age_gap = abs(float(ender_f.get("age") or 0.0) - float(orphan_f.get("age") or 0.0))
    interest_similarity = _jaccard(ender_f["interests"], orphan_f["interests"])
    personality_match = _personality_match(ender_f["personality"], orphan_f["personality"])
    emotional_compatibility = _emotional_compatibility(ender_f, orphan_f)
    attachment_compatibility = _attachment_compatibility(ender_f, orphan_f)
    communication_match = _communication_match(ender_f, orphan_f)
    availability_overlap = _availability_overlap(ender_f, orphan_f)
    support_compatibility = _support_compatibility(ender_f, orphan_f)
    language_match = _language_match(ender_f, orphan_f)
    health_factor = _health_factor(ender_f)

    return [
        age_gap,
        personality_match,
        emotional_compatibility,
        attachment_compatibility,
        interest_similarity,
        communication_match,
        availability_overlap,
        support_compatibility,
        language_match,
        health_factor,
    ]


def _score_features(ender_f: Dict[str, Any], orphan_f: Dict[str, Any]) -> float:
    # Primary: ML prediction (trained from dataset.csv).
    if _ML_MODEL is not None:
        X_row = _ml_feature_vector(ender_f, orphan_f)
        pred = float(_ML_MODEL.predict([X_row])[0])
        return _clamp01(pred)

    # Fallback: deterministic weighted formula.
    interest_similarity = _jaccard(ender_f["interests"], orphan_f["interests"])
    personality_match = _personality_match(ender_f["personality"], orphan_f["personality"])
    emotional_compatibility = _emotional_compatibility(ender_f, orphan_f)
    communication_match = _communication_match(ender_f, orphan_f)
    availability_overlap = _availability_overlap(ender_f, orphan_f)
    support_compatibility = _support_compatibility(ender_f, orphan_f)
    language_match = _language_match(ender_f, orphan_f)

    score = (
        0.25 * interest_similarity
        + 0.15 * personality_match
        + 0.15 * emotional_compatibility
        + 0.10 * communication_match
        + 0.10 * availability_overlap
        + 0.15 * support_compatibility
        + 0.10 * language_match
    )
    return _clamp01(score)


def auto_match_all(elders: List[Dict[str, Any]], orphans: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Greedy one-orphan-once assignment:
    - for each elder, pick the unmatched orphan with MAX compatibility score
    - mark that orphan as matched, then continue

    Structured so this can be swapped for a Hungarian algorithm later.
    """
    if not elders or not orphans:
        return []

    elders_f = [(_extract_profile_features(e), e) for e in elders]
    orphans_f = [(_extract_profile_features(o), o) for o in orphans]

    matched_orphans: Set[str] = set()
    matches: List[Dict[str, Any]] = []

    for elder_f, elder in elders_f:
        best_score = -1.0
        best_orphan: Optional[Dict[str, Any]] = None

        # Greedy: score all remaining orphans for this elder in a batch.
        candidates = []
        for orphan_f, orphan in orphans_f:
            orphan_id = orphan_f.get("id")
            if not orphan_id or orphan_id in matched_orphans:
                continue
            candidates.append({"orphan_f": orphan_f, "orphan": orphan, "orphan_id": orphan_id})

        if not candidates:
            continue

        if _ML_MODEL is not None:
            X = [_ml_feature_vector(elder_f, c["orphan_f"]) for c in candidates]
            preds = _ML_MODEL.predict(X) if X else []
            for cand, pred in zip(candidates, preds):
                score = _clamp01(float(pred))
                if score > best_score:
                    best_score = score
                    best_orphan = cand["orphan"]
        else:
            for cand in candidates:
                score = _score_features(elder_f, cand["orphan_f"])
                if score > best_score:
                    best_score = score
                    best_orphan = cand["orphan"]

        if best_orphan is not None:
            orphan_id = best_orphan.get("id") or best_orphan.get("orphanId")
            elder_id = elder.get("id") or elder.get("elderId")
            if orphan_id and elder_id:
                matches.append({
                    "elderId": elder_id,
                    "orphanId": orphan_id,
                    "score": float(best_score),
                })
                matched_orphans.add(orphan_id)

    return matches


class ProfileMatcher:
    def score_pairs(
        self,
        elder_profile: Dict[str, Any],
        orphan_profiles: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Score each orphan profile for compatibility with the elder.

        Returns a list of:
        { "orphan_id": str, "score": float }
        sorted descending by score (0-1).
        """
        if not orphan_profiles:
            return []

        elder_f = _extract_profile_features(elder_profile)
        orphan_fs = [(_extract_profile_features(o), o) for o in orphan_profiles]

        results: List[Dict[str, Any]] = []

        # Batch predict per elder for speed (100+ profiles).
        if _ML_MODEL is not None:
            valid_pairs: List[Dict[str, Any]] = []
            for orphan_f, orphan in orphan_fs:
                orphan_id = orphan.get("id") or orphan.get("orphan_id") or orphan.get("orphanId")
                if not orphan_id:
                    continue
                valid_pairs.append({"orphan_f": orphan_f, "orphan": orphan, "orphan_id": orphan_id})

            X = [
                _ml_feature_vector(elder_f, pair["orphan_f"])
                for pair in valid_pairs
            ]
            preds = _ML_MODEL.predict(X) if X else []

            for pair, pred in zip(valid_pairs, preds):
                results.append({
                    "orphan_id": pair["orphan_id"],
                    "score": float(round(_clamp01(float(pred)), 4)),
                })
        else:
            for orphan_f, orphan in orphan_fs:
                orphan_id = orphan.get("id") or orphan.get("orphan_id") or orphan.get("orphanId")
                if not orphan_id:
                    continue
                score = _score_features(elder_f, orphan_f)
                results.append({"orphan_id": orphan_id, "score": float(round(score, 4))})

        results.sort(key=lambda r: r["score"], reverse=True)
        return results


# Singleton-like instance used by FastAPI.
matcher = ProfileMatcher()

