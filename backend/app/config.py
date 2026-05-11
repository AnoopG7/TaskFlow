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
    groq_model: str = "llama-3.3-70b-versatile"
    
    # Telegram
    telegram_token: str = ""
    webhook_base_url: str = ""  # Set in Render dashboard (e.g., https://your-app.onrender.com)
    
    # CORS - set in Render dashboard
    cors_origins: str = ""
    
    # Environment
    environment: str = "development"
    debug: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = False
    
    def get_cors_origins(self) -> list[str]:
        if not self.cors_origins:
            return ["http://localhost:5173"]
        return [url.strip() for url in self.cors_origins.split(",") if url.strip()]


@lru_cache()
def get_settings():
    """Get cached settings instance"""
    return Settings()
