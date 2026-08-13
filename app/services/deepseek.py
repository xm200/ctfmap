import json

import httpx

from app.config import settings

_SYSTEM_PROMPT = """\
You are an analyst of Russian CTF (Capture The Flag) cybersecurity competitions.
Given the HTML content of a competition page, extract structured information as JSON.

Required JSON fields:
- title (string): full competition name
- short_title (string): abbreviated name, 2-5 chars
- category (string): one of "elite", "local", "training"
- format (string): one of "online", "offline", "hybrid"
- difficulty (string): one of "easy", "medium", "hard"
- description (string): 1-2 sentence summary
- full_description (string): detailed description from page
- start_date (string): date only, format YYYY-MM-DD (e.g. "2026-08-19")
- end_date (string): date only, format YYYY-MM-DD (e.g. "2026-08-20")
- city (string or null)
- region (string or null): ISO 3166-2 code for Russian region. Examples: "RU-MOW" for Moscow, "RU-SPE" for Saint Petersburg, "RU-SAM" for Samara, "RU-NVS" for Novosibirsk, "RU-SVE" for Sverdlovsk (Yekaterinburg), "RU-TA" for Tatarstan (Kazan), "RU-KDA" for Krasnodar. Must start with "RU-". If city is known but region code is unclear, use the capital city's region.
- organizer (string or null)
- url (string or null): official competition URL
- registration_url (string or null)
- tags (array of strings): e.g. ["web", "crypto", "pwn"]
- task_categories (array of strings): specific task types mentioned
- team_size (string or null): e.g. "1-4 players"
- contacts (string or null)
- requirements (array of strings)

If a field cannot be determined from the page, set it to null or [].
Respond ONLY with valid JSON, no markdown fences.\
"""


async def analyze_html(name: str, html: str) -> dict | None:
    if not settings.DEEPSEEK_API_KEY:
        return None

    html_trimmed = html[:15000] if len(html) > 15000 else html

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"{settings.DEEPSEEK_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.DEEPSEEK_MODEL,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user", "content": f"Competition: {name}\n\nPage content:\n{html_trimmed}"},
                ],
            },
        )
        resp.raise_for_status()

    content = resp.json()["choices"][0]["message"]["content"]
    return json.loads(content)


_VALIDATE_PROMPT = """\
You are a reviewer of CTF competition registration requests on a Russian CTF aggregation platform.
An organizer submitted a competition for review. Analyze the data and return a JSON assessment.

Check for:
1. Is the description adequate and relevant to a CTF competition?
2. Does the chosen category (elite/local/training) match the described difficulty and scale?
3. Are dates realistic?
4. Does the competition look legitimate (not spam, not duplicate)?
5. Are there any red flags?

Return JSON with fields:
- verdict (string): one of "approve", "review", "reject"
- confidence (float): 0.0 to 1.0
- summary (string): 1-2 sentence assessment in Russian for the admin
- suggestions (array of strings): specific things admin should check, in Russian\
"""


async def validate_registration(data: dict) -> dict | None:
    if not settings.DEEPSEEK_API_KEY:
        return None

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"{settings.DEEPSEEK_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.DEEPSEEK_MODEL,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": _VALIDATE_PROMPT},
                    {"role": "user", "content": json.dumps(data, ensure_ascii=False)},
                ],
            },
        )
        resp.raise_for_status()

    content = resp.json()["choices"][0]["message"]["content"]
    return json.loads(content)
