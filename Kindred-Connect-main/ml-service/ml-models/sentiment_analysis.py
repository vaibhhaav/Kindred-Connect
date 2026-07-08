"""
sentiment_analysis.py

Thin wrapper around VADER sentiment analysis to provide a simple API for the
Kindred Connect feedback pipeline.

Input:
    text: str

Output:
    {
        "sentiment": "positive" | "negative" | "neutral",
        "score": float,   # compound score in [-1, 1]
        "emotions": List[str]
    }
"""

from __future__ import annotations

from typing import Dict, Any, List

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer


_analyzer = SentimentIntensityAnalyzer()


def _map_compound_to_label(compound: float) -> str:
    if compound >= 0.35:
        return "positive"
    if compound <= -0.35:
        return "negative"
    return "neutral"


def _infer_emotions(compound: float) -> List[str]:
    """
    Crude mapping from sentiment score to coarse-grained emotions
    for dashboard summaries.
    """
    if compound >= 0.5:
        return ["happy", "connected"]
    if compound >= 0.2:
        return ["hopeful", "curious"]
    if compound <= -0.5:
        return ["sad", "worried"]
    if compound <= -0.2:
        return ["disappointed"]
    return ["neutral"]


def analyze_text(text: str) -> Dict[str, Any]:
    """Analyze feedback text and return a structured sentiment payload."""
    if not text or not isinstance(text, str):
        return {
            "sentiment": "neutral",
            "score": 0.0,
            "emotions": ["neutral"],
        }

    scores = _analyzer.polarity_scores(text)
    compound = scores.get("compound", 0.0)
    label = _map_compound_to_label(compound)
    emotions = _infer_emotions(compound)

    return {
        "sentiment": label,
        "score": float(compound),
        "emotions": emotions,
    }

