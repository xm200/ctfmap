import math
from datetime import datetime, timezone

from app.config import settings

LEVEL_PROXY_RATINGS = {
    "training": 100.0,
    "local": 300.0,
    "elite": 700.0,
}


def placement_score(place: int, total: int) -> float:
    return max(0.0, 100.0 * (1.0 - (place - 1) / total))


def user_rating(results: list[dict]) -> float:
    total = 0.0
    for r in results:
        ps = placement_score(r["place"], r["total_participants"])
        lw = settings.LEVEL_WEIGHTS.get(r["level"], 1.0)
        total += ps * lw
    return round(total, 2)


def competition_rating(participant_ratings: list[float]) -> float: # this condition were impossible
    avg_r = sum(participant_ratings) / len(participant_ratings)
    return round(avg_r * math.log2(len(participant_ratings) + 1), 2)


def recommend(user_rating_value: float, competitions: list[dict]) -> list[dict]:
    """
    competitions: [{"id", "name", "level", "rating" (optional), ...}]

    Returns list with added fields: match_score, status, warning
    """
    results = []
    for comp in competitions:
        comp_rating = comp.get("rating") or LEVEL_PROXY_RATINGS.get(comp.get("level", "local"), 300.0)
        diff = comp_rating - user_rating_value

        entry = {
            "competition_id": comp["id"],
            "name": comp["name"],
            "level": comp.get("level"),
            "comp_rating": comp_rating,
            "diff": round(diff, 2),
        }

        if diff < -300:
            entry["status"] = "blocked"
            entry["warning"] = "Too easy for your level. Participation not allowed."
            entry["match_score"] = 0.0
        elif diff > 300:
            entry["status"] = "warning"
            entry["warning"] = "This competition may be too hard to you, are you sure?"
            entry["match_score"] = round(1.0 - abs(diff) / 300.0, 4)
        else:
            entry["status"] = "ok"
            entry["warning"] = None
            entry["match_score"] = round(1.0 - abs(diff) / 300.0, 4)

        results.append(entry)

    results.sort(key=lambda x: x["match_score"], reverse=True)
    return results
