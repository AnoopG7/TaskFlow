from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    """Application configuration from environment variables"""
    
    # Supabase
    supabase_url: str = ""
    supabase_key: str = ""
    supabase_service_role_key: str = ""
    
    # Groq
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"
    
    # Telegram
    telegram_token: str = ""
    webhook_base_url: str = ""  # Set in Render dashboard (e.g., https://your-app.onrender.com)
    
    # CORS - set in Render dashboard
    cors_origins: str = ""
    # Optional regex for extra origins, e.g. Vercel preview deployments:
    #   ^https://taskflow-[a-z0-9-]+-yourname\.vercel\.app$
    cors_origin_regex: str = ""
    
    # Environment
    environment: str = "development"
    debug: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = False
    
    def get_webhook_base_url(self) -> str:
        """Explicit WEBHOOK_BASE_URL, else the URL Render injects for the service."""
        return (self.webhook_base_url or os.environ.get("RENDER_EXTERNAL_URL", "")).rstrip("/")

    def get_cors_origins(self) -> list[str]:
        if not self.cors_origins:
            return ["http://localhost:5173"]
        return [url.strip().rstrip("/") for url in self.cors_origins.split(",") if url.strip()]


@lru_cache()
def get_settings():
    """Get cached settings instance"""
    return Settings()
