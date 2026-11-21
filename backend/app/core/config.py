"""
Application configuration for The India Frames Backend.
Managed via Pydantic BaseSettings and environment variables.
"""

from typing import List, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App info
    PROJECT_NAME: str = "The India Frames API"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS configuration - strict list of allowed origins, never wildcards with credentials
    ALLOWED_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v  # type: ignore
        raise ValueError(v)

    # Database settings
    # PyMongo AsyncMongoClient URI; optional in local dev to enable decoupled testing
    MONGODB_URI: str | None = None
    MONGODB_DB_NAME: str = "the_india_frames"

    # Session & Security (placeholders for Phase 0)
    SESSION_SECRET_KEY: str = "phase-0-development-secret-key-change-in-production"
    COOKIE_DOMAIN: str | None = None
    COOKIE_SECURE: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
