"""
Auth routes — signup and login via Supabase Auth.

Signup flow:
  1. auth.sign_up() via ANON client → triggers confirmation email
  2. Insert user_profiles row (profile exists before email is confirmed)
  3. Return success message — user must confirm email before logging in

Login flow:
  1. sign_in_with_password() via ANON client → get JWT token
  2. Fetch profile name
  3. Return { token, user_id, name }
"""
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field, EmailStr
from app.services.supabase_service import get_supabase_service, get_supabase_anon
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class SignupRequest(BaseModel):
    email: EmailStr = Field(..., description="User email")
    password: str = Field(..., min_length=8, description="Password (min 8 chars)")
    name: str = Field(..., min_length=1, description="User's full name")


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="User email")
    password: str = Field(..., description="Password")


class AuthResponse(BaseModel):
    token: str = Field(..., description="JWT access token")
    user_id: str = Field(..., description="User UUID")
    name: str = Field(..., description="User's full name")


class SignupResponse(BaseModel):
    status: str = Field(..., description="'confirm_email' or 'logged_in'")
    message: str = Field(..., description="Human-readable message")
    user_id: Optional[str] = Field(None, description="User UUID if available")
    token: Optional[str] = Field(None, description="JWT token if auto-confirmed")
    name: Optional[str] = Field(None, description="User name")


class ProfileCreate(BaseModel):
    user_id: str
    name: str
    email: Optional[str] = None
    timezone: str = "IST"
    work_hours: dict = {"start": 9, "end": 17}
    notification_channels: dict = {"primary": "telegram", "secondary": "email"}
    telegram_chat_id: Optional[str] = None


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    timezone: Optional[str] = None
    work_hours: Optional[dict] = None
    notification_channels: Optional[dict] = None
    telegram_chat_id: Optional[str] = None
    brief_time: Optional[str] = None


@router.post("/signup", response_model=SignupResponse)
async def signup(req: SignupRequest):
    """
    Create a new user account via Supabase Auth.

    Uses auth.sign_up() which triggers Supabase's email confirmation flow.
    """
    try:
        auth_client = get_supabase_anon()       # ANON key for auth.sign_up
        admin_client = get_supabase_service()    # SERVICE_ROLE for profile insert

        if not auth_client or not admin_client:
            raise HTTPException(status_code=500, detail="Database not configured")

        # 1. Sign up via ANON client — triggers confirmation email
        try:
            signup_response = auth_client.auth.sign_up({
                "email": req.email,
                "password": req.password,
                "options": {
                    "data": {
                        "name": req.name,
                    }
                }
            })
        except Exception as signup_error:
            error_msg = str(signup_error).lower()
            if "already registered" in error_msg or "already been registered" in error_msg:
                raise HTTPException(
                    status_code=409,
                    detail="This email is already registered. Try signing in instead."
                )
            if "rate limit" in error_msg or "too many requests" in error_msg:
                raise HTTPException(
                    status_code=429,
                    detail="Too many signup attempts. Please wait a moment and try again."
                )
            logger.error("Signup failed: %s", signup_error)
            raise HTTPException(status_code=400, detail=f"Signup failed: {signup_error}")

        if not signup_response.user:
            raise HTTPException(status_code=400, detail="Signup failed — could not create user")

        user_id = str(signup_response.user.id)
        logger.info("Created user: %s (email: %s)", user_id, req.email)

        # 2. Create user profile (can exist before email confirmation)
        try:
            admin_client.table("user_profiles").insert({
                "user_id": user_id,
                "name": req.name,
                "email": req.email,
                "timezone": "IST",
                "work_hours": {"start": 9, "end": 17},
                "notification_channels": {"primary": "telegram", "secondary": "email"},
                "do_not_disturb": {"enabled": False, "start": "20:00", "end": "08:00"},
                "brief_time": "07:00",
            }).execute()
            logger.info("Created profile for user: %s", user_id)
        except Exception as profile_error:
            logger.warning("Profile creation failed (non-blocking): %s", profile_error)

        # 3. Check if we got a session (means email confirmation is disabled)
        if signup_response.session:
            return SignupResponse(
                status="logged_in",
                message="Account created successfully!",
                user_id=user_id,
                token=signup_response.session.access_token,
                name=req.name,
            )

        # Email confirmation required — try auto-confirm via admin API
        try:
            admin_client.auth.admin.update_user_by_id(
                user_id,
                attributes={"email_confirm": True},
            )
            logger.info("Auto-confirmed user: %s", user_id)

            # Re-sign in to get a valid session token
            auto_login = auth_client.auth.sign_in_with_password({
                "email": req.email,
                "password": req.password,
            })
            if auto_login.session:
                return SignupResponse(
                    status="logged_in",
                    message="Account created successfully!",
                    user_id=user_id,
                    token=auto_login.session.access_token,
                    name=req.name,
                )
        except Exception as confirm_error:
            logger.warning("Auto-confirm failed: %s", confirm_error)

        # Fallback — email confirmation still needed
        return SignupResponse(
            status="confirm_email",
            message="Account created! Please check your email to verify your account.",
            user_id=user_id,
            token=None,
            name=req.name,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Signup failed: %s", e, exc_info=True)
        raise HTTPException(status_code=400, detail=f"Signup failed: {e}")


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    """Login with email and password."""
    try:
        auth_client = get_supabase_anon()       # ANON key for sign_in
        admin_client = get_supabase_service()    # SERVICE_ROLE for profile lookup

        if not auth_client or not admin_client:
            raise HTTPException(status_code=500, detail="Database not configured")

        # Sign in via ANON client
        try:
            response = auth_client.auth.sign_in_with_password({
                "email": req.email,
                "password": req.password,
            })
        except Exception as auth_error:
            error_msg = str(auth_error).lower()
            if "email not confirmed" in error_msg:
                raise HTTPException(
                    status_code=403,
                    detail="Please confirm your email before signing in. Check your inbox."
                )
            logger.warning("Login failed for %s: %s", req.email, auth_error)
            raise HTTPException(status_code=401, detail="Invalid email or password")

        if not response.user or not response.session:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        user_id = str(response.user.id)

        # Fetch profile name
        name = "User"
        try:
            profile_res = (
                admin_client.table("user_profiles")
                .select("name")
                .eq("user_id", user_id)
                .single()
                .execute()
            )
            if profile_res.data:
                name = profile_res.data.get("name", "User")
        except Exception as profile_error:
            logger.warning("Could not fetch profile for %s: %s", user_id, profile_error)

        return AuthResponse(
            token=response.session.access_token,
            user_id=user_id,
            name=name,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Login error: %s", e)
        raise HTTPException(status_code=401, detail="Invalid email or password")


# ─── Profile CRUD ─────────────────────────────────────────────


@router.get("/profile")
async def get_profile(x_user_id: str = Header(..., alias="X-User-ID")):
    """Get user profile."""
    from app.services.supabase_service import get_user_profile
    profile = await get_user_profile(x_user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.post("/profile")
async def create_or_update_profile(profile: ProfileCreate):
    """Create or update user profile."""
    from app.services.supabase_service import upsert_user_profile
    result = await upsert_user_profile(profile.model_dump())
    return result



# ─── Agent Preferences ─────────────────────────────────────────────

class AgentPreferencesUpdate(BaseModel):
    """Schema for updating agent preferences"""
    # Notifications
    notification_enabled: Optional[bool] = None
    dnd_enabled: Optional[bool] = None
    dnd_start: Optional[str] = None  # "HH:MM"
    dnd_end: Optional[str] = None    # "HH:MM"
    morning_brief_time: Optional[str] = None

    # Agent behavior (BASIC - custom instructions only)
    custom_agent_instructions: Optional[str] = Field(None, max_length=1000)

    # Telegram
    telegram_chat_id: Optional[str] = None
    telegram_notifications_enabled: Optional[bool] = None

    # Triggers
    enable_morning_brief: Optional[bool] = None
    enable_evening_debrief: Optional[bool] = None
    enable_risk_detection: Optional[bool] = None
    enable_overload_warnings: Optional[bool] = None


@router.get("/preferences")
async def get_agent_preferences_endpoint(x_user_id: str = Header(..., alias="X-User-ID")):
    """Get agent preferences with defaults fallback."""
    from app.services.supabase_service import get_agent_preferences
    try:
        prefs = await get_agent_preferences(x_user_id)
        return prefs
    except Exception as e:
        logger.error(f"Error getting agent preferences: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve preferences")


@router.post("/preferences")
async def update_agent_preferences_endpoint(prefs: AgentPreferencesUpdate, x_user_id: str = Header(..., alias="X-User-ID")):
    """Update agent preferences."""
    from app.services.supabase_service import update_agent_preferences
    try:
        updates = {k: v for k, v in prefs.model_dump().items() if v is not None}
        result = await update_agent_preferences(x_user_id, updates)
        logger.info(f"✅ Agent preferences updated for user {x_user_id}")
        return result
    except Exception as e:
        logger.error(f"Error updating agent preferences: {e}")
        raise HTTPException(status_code=500, detail="Failed to update preferences")


@router.post("/preferences/reset")
async def reset_agent_preferences_endpoint(x_user_id: str = Header(..., alias="X-User-ID")):
    """Reset agent preferences to defaults."""
    from app.services.supabase_service import reset_agent_preferences
    try:
        result = await reset_agent_preferences(x_user_id)
        logger.info(f"✅ Agent preferences reset for user {x_user_id}")
        return result
    except Exception as e:
        logger.error(f"Error resetting agent preferences: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset preferences")