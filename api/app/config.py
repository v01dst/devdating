from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://devdating:devdating@localhost:5432/devdating"
    redis_url: str = "redis://localhost:6379/0"
    github_client_id: str = ""
    github_client_secret: str = ""
    github_redirect_url: str = ""
    web_origin: str = "http://localhost:3000"
    session_secret: str = "development-secret"
    environment: str = "local"
    match_threshold: float = 65

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
