from functools import lru_cache
from pydantic import BaseModel
import os


class Settings(BaseModel):
    pg_database: str = os.getenv("PGDATABASE", "pulsehub")
    pg_user: str = os.getenv("PGUSER", "n8ndsuprema")
    pg_password: str = os.getenv("PGPASSWORD", "a5f4a173aee84ea452e193e643fe817c")
    pg_host: str = os.getenv("PGHOST", "5.78.154.75")
    pg_port: str = os.getenv("PGPORT", "5436")

    api_prefix: str = "/api"
    default_timezone: str = "America/Sao_Paulo"

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.pg_user}:{self.pg_password}"
            f"@{self.pg_host}:{self.pg_port}/{self.pg_database}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
