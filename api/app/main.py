from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import lifespan
from .routers import admin
from .routers import meeting_types, meetings, sprints

settings = get_settings()

app = FastAPI(
    title="PulseHub Admin API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin.router, prefix=settings.api_prefix)
app.include_router(meetings.router, prefix=settings.api_prefix)
app.include_router(meeting_types.router, prefix=settings.api_prefix)
app.include_router(sprints.router, prefix=settings.api_prefix)


@app.get("/health", tags=["health"])
async def healthcheck():
    return {"status": "ok"}
