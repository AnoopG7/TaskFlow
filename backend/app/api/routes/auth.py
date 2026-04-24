from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class ProfileCreate(BaseModel):
    user_id: str
    name: str
    email: str | None = None
    timezone: str = "IST"
    work_hours: dict = {"start": 9, "end": 17}
    notification_channels: dict = {"primary": "telegram", "secondary": "email"}
    telegram_chat_id: str | None = None


class ProfileUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    timezone: str | None = None
    work_hours: dict | None = None
    notification_channels: dict | None = None
    telegram_chat_id: str | None = None
    brief_time: str | None = None


@router.post("/profile")
async def create_or_update_profile(profile: ProfileCreate):
    """Create or update user profile."""
    from app.services.supabase_service import upsert_user_profile
    
    profile_data = profile.model_dump()
    result = await upsert_user_profile(profile_data)
    return result


@router.get("/profile")
async def get_profile(user_id: str):
    """Get user profile."""
    from app.services.supabase_service import get_user_profile
    
    profile = await get_user_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


# Auth stubs - use Supabase Auth for production
@router.post("/signup")
async def signup():
    """Signup - use Supabase Auth in production"""
    return {"message": "Use Supabase Auth for production. For dev, just use user_id."}


@router.post("/login")
async def login():
    """Login - use Supabase Auth in production"""
    return {"message": "Use Supabase Auth for production. For dev, just use user_id."}