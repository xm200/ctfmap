import pytest
from httpx import AsyncClient

from app.services.ranking import recommend, user_rating, competition_rating, placement_score

BASE_URL = "http://127.0.0.1:8080"


class TestPlacementScore:
    def test_first_place(self):
        assert placement_score(1, 50) == 100.0

    def test_last_place(self):
        assert placement_score(50, 50) == pytest.approx(2.0)

    def test_middle(self):
        assert placement_score(5, 10) == pytest.approx(60.0)


class TestUserRating:
    def test_single_result(self):
        results = [{"place": 1, "total_participants": 10, "level": "training"}]
        assert user_rating(results) == pytest.approx(100.0)

    def test_level_weights(self):
        base = [{"place": 1, "total_participants": 10, "level": "training"}]
        local = [{"place": 1, "total_participants": 10, "level": "local"}]
        elite = [{"place": 1, "total_participants": 10, "level": "elite"}]
        assert user_rating(local) == pytest.approx(user_rating(base) * 2)
        assert user_rating(elite) == pytest.approx(user_rating(base) * 5)

    def test_multiple_results_accumulate(self):
        results = [
            {"place": 1, "total_participants": 10, "level": "training"},
            {"place": 1, "total_participants": 10, "level": "training"},
        ]
        assert user_rating(results) == pytest.approx(200.0)


class TestCompetitionRating:
    def test_basic(self):
        rating = competition_rating([100.0, 200.0, 300.0])
        assert rating > 0

    def test_more_participants_higher(self):
        few = competition_rating([200.0, 200.0])
        many = competition_rating([200.0, 200.0, 200.0, 200.0])
        assert many > few


COMPETITIONS = [
    {"id": 1, "name": "Baby CTF", "level": "training"},
    {"id": 2, "name": "City CTF", "level": "local"},
    {"id": 3, "name": "RuCTF Finals", "level": "elite"},
]


class TestRecommendStatus:
    def test_blocked_too_easy(self):
        recs = recommend(700.0, COMPETITIONS)
        baby = next(r for r in recs if r["competition_id"] == 1)
        assert baby["status"] == "blocked"
        assert baby["warning"] is not None
        assert baby["match_score"] == 0.0

    def test_warning_too_hard(self):
        recs = recommend(50.0, COMPETITIONS)
        elite = [r for r in recs if r["competition_id"] == 3]
        if elite:
            assert elite[0]["status"] == "warning"
            assert elite[0]["warning"] is not None

    def test_ok_good_match(self):
        recs = recommend(300.0, COMPETITIONS)
        city = next(r for r in recs if r["competition_id"] == 2)
        assert city["status"] == "ok"
        assert city["warning"] is None

    def test_sorted_by_match_score(self):
        recs = recommend(300.0, COMPETITIONS)
        scores = [r["match_score"] for r in recs]
        assert scores == sorted(scores, reverse=True)

    def test_custom_rating_overrides_level(self):
        comps = [{"id": 10, "name": "Custom", "level": "training", "rating": 500.0}]
        recs = recommend(500.0, comps)
        assert recs[0]["comp_rating"] == 500.0
        assert recs[0]["match_score"] == 1.0


class TestRecommendEdgeCases:
    def test_empty_competitions(self):
        assert recommend(100.0, []) == []

    def test_exact_boundary_300(self):
        comps = [{"id": 1, "name": "Edge", "level": "local", "rating": 600.0}]
        recs = recommend(300.0, comps)
        assert recs[0]["status"] == "ok"

    def test_exact_boundary_minus_300(self):
        comps = [{"id": 1, "name": "Edge", "level": "local", "rating": 100.0}]
        recs = recommend(400.0, comps)
        assert recs[0]["status"] == "ok"

    def test_just_over_minus_300(self):
        comps = [{"id": 1, "name": "Edge", "level": "local", "rating": 99.0}]
        recs = recommend(400.0, comps)
        assert recs[0]["status"] == "blocked"


@pytest.mark.asyncio
async def test_recommend_api_format():
    async with AsyncClient(base_url=BASE_URL) as client:
        resp = await client.post("/api/analytics/recommend", json={
            "user_rating": 300.0,
            "competitions": [
                {"id": 1, "name": "Baby CTF", "level": "training"},
                {"id": 2, "name": "City CTF", "level": "local"},
                {"id": 3, "name": "RuCTF Finals", "level": "elite"},
            ],
        })
    assert resp.status_code == 200
    data = resp.json()
    assert "recommendations" in data
    for rec in data["recommendations"]:
        assert "competition_id" in rec
        assert "name" in rec
        assert "comp_rating" in rec
        assert "match_score" in rec
        assert "status" in rec
        assert rec["status"] in ("ok", "warning", "blocked")


@pytest.mark.asyncio
async def test_recommend_api_blocked_and_warning():
    async with AsyncClient(base_url=BASE_URL) as client:
        resp = await client.post("/api/analytics/recommend", json={
            "user_rating": 700.0,
            "competitions": [
                {"id": 1, "name": "Baby CTF", "level": "training"},
                {"id": 2, "name": "RuCTF Finals", "level": "elite"},
            ],
        })
    data = resp.json()
    statuses = {r["name"]: r["status"] for r in data["recommendations"]}
    assert statuses["Baby CTF"] == "blocked"
    assert statuses["RuCTF Finals"] == "ok"


@pytest.mark.asyncio
async def test_user_rating_api():
    async with AsyncClient(base_url=BASE_URL) as client:
        resp = await client.post("/api/analytics/rating/user", json={
            "results": [
                {"place": 1, "total_participants": 10, "level": "elite"},
            ],
        })
    assert resp.status_code == 200
    data = resp.json()
    assert "rating" in data
    assert data["rating"] == 500.0


@pytest.mark.asyncio
async def test_competition_rating_api():
    async with AsyncClient(base_url=BASE_URL) as client:
        resp = await client.post("/api/analytics/rating/competition", json={
            "participant_ratings": [100.0, 200.0, 300.0],
        })
    assert resp.status_code == 200
    data = resp.json()
    assert "rating" in data
    assert data["rating"] > 0


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(base_url=BASE_URL) as client:
        resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
