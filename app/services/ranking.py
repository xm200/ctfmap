"""
Rating formulas — stateless functions, no DB dependency.
Other teams call these or we expose via API.

User Rating:
  R_user = Σ (placement_score × level_weight × recency_decay)
  placement_score = max(0, 100 × (1 - (place-1) / total))
  level_weight    = {training: 1.0, local: 2.0, elite: 5.0}
  recency_decay   = 0.95 ^ months_since

Competition Rating:
  R_comp = avg(R_user of participants) × format_weight × log2(participants + 1)
"""

import math
from datetime import datetime, timezone

from app.config import settings


def placement_score(place: int, total: int) -> float:
    if total <= 0 or place <= 0:
        return 0.0
    return max(0.0, 100.0 * (1.0 - (place - 1) / total))


def recency_decay(competition_date: datetime, now: datetime | None = None) -> float:
    now = now or datetime.now(timezone.utc)
    if competition_date.tzinfo is None:
        competition_date = competition_date.replace(tzinfo=timezone.utc)
    months = max(0.0, (now - competition_date).days / 30.0)
    return 0.95 ** months


def user_rating(results: list[dict]) -> float:
    """
    Compute total user rating from competition results.

    Each result dict: {
        "place": int,
        "total_participants": int,
        "level": "training" | "local" | "elite",
        "date": "2026-01-15T00:00:00" (iso string or datetime)
    }
    """
    total = 0.0
    for r in results:
        ps = placement_score(r["place"], r["total_participants"])
        lw = settings.LEVEL_WEIGHTS.get(r["level"], 1.0)
        date = r["date"] if isinstance(r["date"], datetime) else datetime.fromisoformat(r["date"])
        rd = recency_decay(date)
        total += ps * lw * rd
    return round(total, 2)


def competition_rating(participant_ratings: list[float]) -> float:
    """
    Compute competition rating from its participants' user ratings.

    R_comp = avg(ratings) × log2(len(participants) + 1)
    """
    if not participant_ratings:
        return 0.0
    avg_r = sum(participant_ratings) / len(participant_ratings)
    return round(avg_r * math.log2(len(participant_ratings) + 1), 2)
