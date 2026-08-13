import asyncio
import logging
import traceback

import httpx

from config import API_TOKEN, API_URL, CRAWL_INTERVAL
from sources.ctftime import CTFTimeSource

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("scraper")


async def wait_for_api() -> None:
    log.info("Ожидание API (%s)...", API_URL)
    async with httpx.AsyncClient(trust_env=False) as client:
        for attempt in range(30):
            try:
                resp = await client.get(f"{API_URL}/health", timeout=5.0)
                if resp.status_code == 200:
                    log.info("API доступен")
                    return
            except Exception:
                pass
            log.info("Попытка %d/30 — API не готов, повтор через 2с...", attempt + 1)
            await asyncio.sleep(2)
    log.warning("API не ответил за 60с, продолжаю...")


async def post_to_api(competitions: list) -> None:
    payload = {
        "competitions": [
            {
                "name": c.name,
                "url": c.url,
                "start_date": c.start_date.isoformat() if c.start_date else None,
                "location": c.location,
                "source_url": c.source_url,
                "raw_html": c.raw_html,
            }
            for c in competitions
        ]
    }

    log.info("Отправка %d соревнований → %s", len(competitions), API_URL)
    async with httpx.AsyncClient(timeout=60.0, trust_env=False) as client:
        for attempt in range(3):
            try:
                resp = await client.post(
                    f"{API_URL}/api/parser/competitions",
                    json=payload,
                    headers={"X-Api-Token": API_TOKEN},
                )
                resp.raise_for_status()
                log.info("Успешно отправлено, статус %d", resp.status_code)
                return
            except httpx.ConnectError as exc:
                log.warning("Попытка %d/3 — ошибка подключения: %s", attempt + 1, exc)
                await asyncio.sleep(5)
            except httpx.HTTPStatusError as exc:
                log.error("API вернул ошибку %d: %s", exc.response.status_code, exc.response.text[:500])
                return
    log.error("Не удалось отправить данные после 3 попыток")


async def main() -> None:
    if not API_TOKEN:
        log.error("API_TOKEN не задан, выход")
        return

    sources = [CTFTimeSource()]
    log.info("Скрапер запущен | интервал=%dс | API=%s", CRAWL_INTERVAL, API_URL)

    await wait_for_api()

    while True:
        for source in sources:
            log.info("--- Запуск источника: %s ---", source.name)
            try:
                competitions = await source.fetch()
                if competitions:
                    for c in competitions:
                        log.info("  [%s] %s (%s)", source.name, c.name, c.source_url)
                    await post_to_api(competitions)
                else:
                    log.info("[%s] Новых событий не найдено", source.name)
            except Exception:
                log.exception("Ошибка в источнике %s", source.name)

        log.info("Следующий цикл через %dс", CRAWL_INTERVAL)
        await asyncio.sleep(CRAWL_INTERVAL)


if __name__ == "__main__":
    asyncio.run(main())
