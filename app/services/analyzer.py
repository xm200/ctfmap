import re
import traceback

import json

from app.database import async_session
from app.models.parsed_competition import ParsedCompetition
from app.models.registration import CompetitionRegistration
from app.services.deepseek import analyze_html, validate_registration


async def analyze_competition(competition_id: int) -> None:
    async with async_session() as db:
        comp = await db.get(ParsedCompetition, competition_id)
        if not comp or not comp.raw_html:
            return

        comp.analysis_status = "processing"
        await db.commit()

        try:
            result = await analyze_html(comp.name, comp.raw_html)
            if not result:
                comp.analysis_status = "failed"
                await db.commit()
                return

            title = result.get("title") or comp.name

            reg_data = {
                "title": title,
                "organizer": result.get("organizer"),
                "category": result.get("category", "local"),
                "difficulty": result.get("difficulty"),
                "format": result.get("format", "offline"),
                "description": result.get("description"),
                "full_description": result.get("full_description"),
                "start_date": result.get("start_date"),
                "end_date": result.get("end_date"),
                "city": result.get("city"),
                "region": result.get("region"),
                "tags": result.get("tags") or [],
                "task_categories": result.get("task_categories") or [],
                "team_size": result.get("team_size"),
            }

            validation = await validate_registration(reg_data)
            ai_review = validation or {"source": "parser", "parsed_id": comp.id}
            ai_review["source"] = "parser"
            ai_review["parsed_id"] = comp.id

            registration = CompetitionRegistration(
                title=title,
                short_title=result.get("short_title"),
                organizer=result.get("organizer"),
                contact=result.get("contacts"),
                start_date=result.get("start_date"),
                end_date=result.get("end_date"),
                format=result.get("format", "offline"),
                category=result.get("category", "local"),
                difficulty=result.get("difficulty"),
                city=result.get("city"),
                region=result.get("region"),
                url=result.get("url") or comp.url,
                registration_url=result.get("registration_url"),
                description=result.get("description"),
                full_description=result.get("full_description"),
                tags=result.get("tags") or [],
                task_categories=result.get("task_categories") or [],
                team_size=result.get("team_size"),
                requirements=result.get("requirements") or [],
                ai_review=json.dumps(ai_review, ensure_ascii=False),
            )
            db.add(registration)
            comp.analysis_status = "done"
            await db.commit()

        except Exception:
            traceback.print_exc()
            async with async_session() as fallback_db:
                comp2 = await fallback_db.get(ParsedCompetition, competition_id)
                if comp2:
                    comp2.analysis_status = "failed"
                    await fallback_db.commit()


async def validate_registration_task(registration_id: int) -> None:
    async with async_session() as db:
        reg = await db.get(CompetitionRegistration, registration_id)
        if not reg:
            return

        try:
            data = {
                "title": reg.title,
                "organizer": reg.organizer,
                "category": reg.category,
                "difficulty": reg.difficulty,
                "format": reg.format,
                "description": reg.description,
                "full_description": reg.full_description,
                "start_date": reg.start_date,
                "end_date": reg.end_date,
                "city": reg.city,
                "region": reg.region,
                "tags": reg.tags or [],
                "task_categories": reg.task_categories or [],
                "team_size": reg.team_size,
            }
            result = await validate_registration(data)
            if not result:
                return

            reg.ai_review = json.dumps(result, ensure_ascii=False)
            await db.commit()

        except Exception:
            traceback.print_exc()
