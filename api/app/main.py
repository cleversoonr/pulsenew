from fastapi import FastAPI

from .config import get_settings
from .database import lifespan
from .routers import admin

settings = get_settings()

app = FastAPI(
    title="PulseHub Admin API",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(admin.router, prefix=settings.api_prefix)


@app.get("/health", tags=["health"])
async def healthcheck():
    return {"status": "ok"}
