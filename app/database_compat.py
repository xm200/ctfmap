from collections.abc import Iterable

from sqlalchemy import inspect, text
from sqlalchemy.engine import Connection


_TABLE_COLUMNS: dict[str, tuple[tuple[str, str], ...]] = {
    "users": (
        ("banned", "BOOLEAN NOT NULL DEFAULT FALSE"),
    ),
    "competition_registrations": (
        ("short_title", "VARCHAR(64)"),
        ("category", "VARCHAR(32)"),
        ("difficulty", "VARCHAR(32)"),
        ("registration_url", "VARCHAR(512)"),
        ("ctftime_url", "VARCHAR(512)"),
        ("ctf_news_url", "VARCHAR(512)"),
        ("full_description", "TEXT"),
        ("team_size", "VARCHAR(80)"),
        ("task_categories", "JSON"),
        ("tags", "JSON"),
        ("requirements", "JSON"),
    ),
    "events": (
        ("registration_url", "VARCHAR(512)"),
        ("ctftime_url", "VARCHAR(512)"),
        ("ctf_news_url", "VARCHAR(512)"),
        ("full_description", "TEXT"),
        ("team_size", "VARCHAR(80)"),
        ("task_categories", "JSON"),
        ("requirements", "JSON"),
        ("contacts", "VARCHAR(256)"),
    ),
}


def _missing_columns(connection: Connection, table: str, definitions: Iterable[tuple[str, str]]):
    existing = {column["name"] for column in inspect(connection).get_columns(table)}
    return ((name, sql_type) for name, sql_type in definitions if name not in existing)


def ensure_extended_event_columns(connection: Connection) -> None:
    """Добавляет новые необязательные поля при запуске поверх существующей БД."""
    inspector = inspect(connection)
    tables = set(inspector.get_table_names())
    for table, definitions in _TABLE_COLUMNS.items():
        if table not in tables:
            continue
        for name, sql_type in _missing_columns(connection, table, definitions):
            connection.execute(text(f'ALTER TABLE "{table}" ADD COLUMN "{name}" {sql_type}'))

    # До введения двухролевой модели новые аккаунты создавались как PARTICIPANT.
    # Сохраняем существующие аккаунты, переводя их в роль организатора.
    if "users" in tables:
        connection.execute(
            text("UPDATE users SET role = 'ORGANIZER' WHERE role = 'PARTICIPANT'")
        )
