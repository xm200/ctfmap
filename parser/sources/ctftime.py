import asyncio
import logging
import os

import httpx
from bs4 import BeautifulSoup

from sources.base import BaseSource, Competition

log = logging.getLogger("ctftime")

_USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36"
)
_BASE_URL = "https://ctftime.org"
_HEADERS = {"User-Agent": _USER_AGENT}
_PROXY = os.environ.get("CTFTIME_PROXY", "")


class CTFTimeSource(BaseSource):
    name = "ctftime"

    async def fetch(self) -> list[Competition]:
        proxy = _PROXY or None
        log.info("Прокси: %s", proxy or "нет")
        log.info("Загрузка списка: %s/event/list/upcoming", _BASE_URL)

        async with httpx.AsyncClient(headers=_HEADERS, timeout=60.0, follow_redirects=True, proxy=proxy) as client:
            events = await self._fetch_list(client)
            log.info("Найдено %d российских событий из таблицы", len(events))

            competitions = []
            for i, event in enumerate(events, 1):
                log.info("  [%d/%d] Загрузка: %s — %s", i, len(events), event["name"], event["url"])
                await asyncio.sleep(1)
                try:
                    detail_html = await self._fetch_detail(client, event["url"])
                    log.info("  [%d/%d] OK, %d байт HTML", i, len(events), len(detail_html))
                    competitions.append(Competition(
                        name=event["name"],
                        url=event["url"],
                        start_date=None,
                        location=event["location"],
                        source_url=event["url"],
                        raw_html=detail_html,
                    ))
                except Exception as exc:
                    log.warning("  [%d/%d] Ошибка: %s", i, len(events), exc)

            log.info("Итого: %d соревнований готово к отправке", len(competitions))
            return competitions

    async def _fetch_list(self, client: httpx.AsyncClient) -> list[dict]:
        resp = await client.get(f"{_BASE_URL}/event/list/upcoming")
        log.info("Ответ списка: %d, %d байт", resp.status_code, len(resp.text))
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")

        table = soup.find("table", class_="table table-striped")
        if not table:
            log.warning("Таблица событий не найдена на странице")
            return []

        events = []
        skipped = 0
        for row in table.find_all("tr")[1:]:
            cells = row.find_all("td")
            if len(cells) < 4:
                continue

            location_text = cells[3].get_text(strip=True)
            if not location_text or "Russia" not in location_text:
                skipped += 1
                continue

            link = cells[0].find("a")
            if not link:
                continue

            city = ""
            parts = location_text.split(",")
            if len(parts) > 1:
                city = parts[1].strip()

            events.append({
                "name": link.get_text(strip=True),
                "url": f"{_BASE_URL}{link['href']}",
                "location": city or location_text,
            })

        log.info("Всего строк в таблице: %d, пропущено (не Россия): %d", len(events) + skipped, skipped)
        return events

    async def _fetch_detail(self, client: httpx.AsyncClient, url: str) -> str:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.text
