from supabase import create_client
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)


class SupabaseService:
    """Wrapper for Supabase client and operations"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SupabaseService, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not hasattr(self, 'client'):
            settings = get_settings()
            self.client = create_client(settings.supabase_url, settings.supabase_key)
            logger.info("Supabase client initialized")
    
    def get_user(self, user_id: str):
        """Get user profile"""
        try:
            response = self.client.table("user_profiles").select("*").eq("user_id", user_id).single().execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching user: {e}")
            return None
    
    def save_task(self, user_id: str, task_data: dict):
        """Save task"""
        try:
            data = {"user_id": user_id, **task_data}
            self.client.table("tasks").insert(data).execute()
            return True
        except Exception as e:
            logger.error(f"Error saving task: {e}")
            return False


def get_supabase_service():
    """Get Supabase service singleton"""
    return SupabaseService()
