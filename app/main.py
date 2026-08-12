from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routes import analytics, parser


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print(f"PARSER_API_TOKEN: {settings.PARSER_API_TOKEN}")
    yield


app = FastAPI(title="ctfmap analytics", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(parser.router)
app.include_router(analytics.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
