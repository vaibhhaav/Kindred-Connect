"""
main.py

FastAPI application exposing ML endpoints for Kindred Connect:

- POST /match-profiles
    Input: elder_profile, orphan_profiles[]
    Output: ranked_matches[{orphan_id, score}]

- POST /analyze-sentiment
    Input: text
    Output: {sentiment, score, emotions[]}

Run locally:
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import List, Dict, Any

# `profile_matching.py` and `sentiment_analysis.py` live in `ml-models/`, not in `api/`.
_ML_MODELS_DIR = Path(__file__).resolve().parent.parent / "ml-models"
if str(_ML_MODELS_DIR) not in sys.path:
    sys.path.insert(0, str(_ML_MODELS_DIR))

from fastapi import FastAPI
from pydantic import BaseModel

from profile_matching import auto_match_all, matcher
from sentiment_analysis import analyze_text


class Profile(BaseModel):
    id: str | None = None
    type: str | None = None
    name: str | None = None
    age: int | float | None = None
    gender: str | None = None
    languages: List[str] = []
    hobbies: List[str] = []
    emotional_needs: List[str] = []
    institution: str | None = None

    # Optional feature-engineering fields (used by calculate_compatibility()).
    # These may not exist in Firestore yet; the scorer handles missing gracefully.
    personality: str | None = None
    communication: str | None = None
    availability: int | float | None = None
    traumaLevel: str | None = None
    patienceLevel: str | None = None
    emotional_state: str | None = None
    interests: List[str] = []
    language: str | None = None


class MatchRequest(BaseModel):
    elder_profile: Profile
    orphan_profiles: List[Profile]


class AutoMatchRequest(BaseModel):
    elders: List[Profile]
    orphans: List[Profile]


class SentimentRequest(BaseModel):
    text: str


app = FastAPI(
    title="Kindred Connect ML Service",
    description="Profile matching and sentiment analysis for Kindred Connect.",
    version="1.0.0",
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "kindred-connect-ml"}


@app.post("/match-profiles")
async def match_profiles(payload: MatchRequest):
    """
    Returns ranked match scores for each orphan vs the elder.
    """
    elder_dict = payload.elder_profile.dict()
    orphan_dicts: List[Dict[str, Any]] = [p.dict() for p in payload.orphan_profiles]

    matches = matcher.score_pairs(elder_dict, orphan_dicts)
    return {"matches": matches}


@app.post("/auto-match")
async def auto_match(payload: AutoMatchRequest):
    """
    Bulk matching endpoint.

    Returns a JSON array:
    [
      { "elderId": "...", "orphanId": "...", "score": 0.85 },
      ...
    ]
    """
    elders = [e.dict(exclude_unset=True) for e in payload.elders]
    orphans = [o.dict(exclude_unset=True) for o in payload.orphans]
    return auto_match_all(elders, orphans)


@app.post("/analyze-sentiment")
async def analyze_sentiment(payload: SentimentRequest):
    """
    Returns sentiment and high-level emotions for feedback text.
    """
    result = analyze_text(payload.text)
    return result


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

