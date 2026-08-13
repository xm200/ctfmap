from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


@dataclass
class Competition:
    name: str
    url: str
    start_date: datetime | None
    location: str
    source_url: str
    raw_html: str


class BaseSource(ABC):
    name: str

    @abstractmethod
    async def fetch(self) -> list[Competition]:
        ...
