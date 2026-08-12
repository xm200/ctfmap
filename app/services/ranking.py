import math
from datetime import datetime, timezone

from app.config import settings

def placement_score(place: int, total: int) -> float:
    return max(0.0, 100.0 * (1.0 - (place - 1) / total))


def user_rating(results: list[dict]) -> float:
    total = 0.0
    for r in results:
        ps = placement_score(r["place"], r["total_participants"])
        lw = settings.LEVEL_WEIGHTS.get(r["level"], 1.0)
        date = r["date"] if isinstance(r["date"], datetime) else datetime.fromisoformat(r["date"])
        total += ps * lw
    return round(total, 2)


def competition_rating(participant_ratings: list[float]) -> float:
    avg_r = sum(participant_ratings) / len(participant_ratings)
    return round(avg_r * math.log2(len(participant_ratings) + 1), 2)
