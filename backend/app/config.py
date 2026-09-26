import os
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")
    host: str = Field(default="0.0.0.0", alias="HOST")
    port: int = Field(default=8000, alias="PORT")
    environment: str = Field(default="development", alias="ENVIRONMENT")
    cors_origins: str = Field(default="*", alias="CORS_ORIGINS")
    rate_limit_per_minute: str = Field(default="20/minute", alias="RATE_LIMIT_PER_MINUTE")
    gemini_model: str = Field(default="gemini-3.5-flash-lite", alias="GEMINI_MODEL")
    embedding_model: str = Field(default="gemini-embedding-001", alias="EMBEDDING_MODEL")
    temperature: float = Field(default=0.2, alias="TEMPERATURE")
    
    knowledge_path: Path = BASE_DIR / "data" / "knowledge.json"
    cache_path: Path = BASE_DIR / "data" / "embeddings_cache.json"

    @property
    def cors_origin_list(self) -> list[str]:
        if not self.cors_origins or self.cors_origins.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    class Config:
        env_file = BASE_DIR / ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
