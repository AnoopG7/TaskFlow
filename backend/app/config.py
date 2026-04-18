from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    """Application configuration from environment variables"""
    
    # Supabase
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_key: str = os.getenv("SUPABASE_KEY", "")
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # Groq
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    
    # Telegram
    telegram_token: str = os.getenv("TELEGRAM_TOKEN", "")
    telegram_webhook_url: str = os.getenv("TELEGRAM_WEBHOOK_URL", "")
    
    # CORS
    cors_origins: list = ["http://localhost:3000", "http://localhost:5173", "https://*.vercel.app"]
    
    # Environment
    environment: str = os.getenv("ENVIRONMENT", "development")
    debug: bool = os.getenv("DEBUG", "true").lower() == "true"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings():
    """Get cached settings instance"""
    return Settings()
