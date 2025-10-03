from functools import lru_cache
import os
from typing import List

from pydantic import BaseModel, Field, field_validator


class Settings(BaseModel):
    pg_database: str = os.getenv("PGDATABASE", "pulsehub")
    pg_user: str = os.getenv("PGUSER", "n8ndsuprema")
    pg_password: str = os.getenv("PGPASSWORD", "a5f4a173aee84ea452e193e643fe817c")
    pg_host: str = os.getenv("PGHOST", "5.78.154.75")
    pg_port: str = os.getenv("PGPORT", "5436")

    api_prefix: str = "/api"
    default_timezone: str = "America/Sao_Paulo"
    cors_origins: List[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_origins(cls, value):
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        if isinstance(value, list):
            return value
        return ["http://localhost:3000"]

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.pg_user}:{self.pg_password}"
            f"@{self.pg_host}:{self.pg_port}/{self.pg_database}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
