from supabase import create_client, Client
from app.config import get_settings
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Two clients: one with anon key (reads), one with service role (writes)
_client_anon: Client | None = None
_client_service: Client | None = None
_is_connected: bool | None = None

# In-memory fallback for dev
_tasks: dict[str, list[dict]] = {}
_profiles: dict[str, dict] = {}
_memory: dict[str, dict] = {}
_sessions: dict[str, dict] = {}


def init_supabase() -> None:
    """Initialize Supabase clients."""
    global _client_anon, _client_service, _is_connected
    settings = get_settings()
    
    if not settings.supabase_url or not settings.supabase_key:
        logger.warning("Supabase not configured - using in-memory store")
        return
    
    _client_anon = create_client(settings.supabase_url, settings.supabase_key)
    
    if settings.supabase_service_role_key:
        _client_service = create_client(settings.supabase_url, settings.supabase_service_role_key)
    else:
        _client_service = _client_anon
    
    # Test connection once
    try:
        _client_anon.table("tasks").select("count").execute()
        _is_connected = True
        logger.info("✅ Supabase client connected")
    except Exception:
        _is_connected = False
        logger.warning("Supabase connection failed - using in-memory store")


def get_supabase_anon() -> Client | None:
    """Get anon client (for reads)."""
    global _client_anon
    if _client_anon is None:
        init_supabase()
    return _client_anon


def get_supabase_service() -> Client | None:
    """Get service role client (for writes - bypasses RLS)."""
    global _client_service
    if _client_service is None:
        init_supabase()
    return _client_service


def is_connected() -> bool:
    """Check if Supabase is connected (cached)."""
    global _is_connected
    if _is_connected is None:
        init_supabase()
    return _is_connected or False


# ─────────────────────────────────────────────────────────────────
# PROFILE OPERATIONS
# ─────────────────────────────────────────────────────────────────

async def get_user_profile(user_id: str):
    """Get user profile by user_id."""
    client = get_supabase_anon()
    
    if is_connected() and client:
        try:
            result = client.table("user_profiles").select("*").eq("user_id", user_id).maybe_single().execute()
            return result.data if result.data else None
        except Exception:
            pass
    
    return _profiles.get(user_id)


async def upsert_user_profile(profile: dict):
    """Create or update user profile."""
    client = get_supabase_service()
    
    if is_connected() and client:
        try:
            result = client.table("user_profiles").upsert(profile, on_conflict="user_id").execute()
            return result.data[0] if result.data else None
        except Exception:
            pass
    
    _profiles[profile["user_id"]] = profile
    return profile


# ─────────────────────────────────────────────────────────────────
# TASK OPERATIONS
# ───���─────────────────────────────────────────────────────────────

async def get_tasks(user_id: str, status: str = None, priority: str = None, due_today: bool = False):
    """Get tasks with optional filters."""
    client = get_supabase_anon()
    
    if is_connected() and client:
        try:
            query = client.table("tasks").select("*").eq("user_id", user_id)
            if status:
                query = query.eq("status", status)
            if priority:
                query = query.eq("priority", priority)
            result = query.execute()
            return result.data or []
        except Exception:
            pass
    
    tasks = _tasks.get(user_id, [])
    if status:
        tasks = [t for t in tasks if t.get("status") == status]
    if priority:
        tasks = [t for t in tasks if t.get("priority") == priority]
    return tasks


async def get_task(task_id: str):
    """Get a single task by ID."""
    client = get_supabase_anon()
    
    if is_connected() and client:
        try:
            result = client.table("tasks").select("*").eq("id", task_id).maybe_single().execute()
            return result.data
        except Exception:
            pass
    
    for tasks in _tasks.values():
        for t in tasks:
            if t.get("id") == task_id:
                return t
    return None


async def create_task(task_data: dict):
    """Create a new task."""
    import uuid
    client = get_supabase_service()
    
    if "id" not in task_data:
        task_data["id"] = str(uuid.uuid4())
    
    if is_connected() and client:
        try:
            result = client.table("tasks").insert(task_data).execute()
            return result.data[0] if result.data else None
        except Exception:
            pass
    
    user_id = task_data.get("user_id")
    if user_id not in _tasks:
        _tasks[user_id] = []
    _tasks[user_id].append(task_data)
    return task_data


async def update_task(task_id: str, task_data: dict):
    """Update an existing task."""
    client = get_supabase_service()
    task_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if is_connected() and client:
        try:
            result = client.table("tasks").update(task_data).eq("id", task_id).execute()
            return result.data[0] if result.data else None
        except Exception:
            pass
    
    for tasks in _tasks.values():
        for i, t in enumerate(tasks):
            if t.get("id") == task_id:
                tasks[i].update(task_data)
                return tasks[i]
    return None


async def complete_task(task_id: str, actual_hours: float = None):
    """Mark a task as completed."""
    client = get_supabase_service()
    update_data = {
        "status": "completed",
        "completed_date": datetime.now(timezone.utc).isoformat(),
    }
    if actual_hours:
        update_data["actual_hours"] = actual_hours
    
    if is_connected() and client:
        try:
            result = client.table("tasks").update(update_data).eq("id", task_id).execute()
            return result.data[0] if result.data else None
        except Exception:
            pass
    
    return await update_task(task_id, update_data)


async def delete_task(task_id: str) -> bool:
    """Delete a task."""
    client = get_supabase_service()
    
    if is_connected() and client:
        try:
            result = client.table("tasks").delete().eq("id", task_id).execute()
            return bool(result.data)
        except Exception:
            pass
    
    for tasks in _tasks.values():
        for i, t in enumerate(tasks):
            if t.get("id") == task_id:
                tasks.pop(i)
                return True
    return False


# ─────────────────────────────────────────────────────────────────
# PROJECT OPERATIONS
# ─────────────────────────────────────────────────────────────────

async def get_projects(user_id: str):
    """Get all projects for a user."""
    client = get_supabase_anon()
    
    if is_connected() and client:
        try:
            result = client.table("projects").select("*").eq("user_id", user_id).execute()
            return result.data or []
        except Exception:
            pass
    
    return []


async def create_project(project_data: dict):
    """Create a new project."""
    client = get_supabase_service()
    
    if is_connected() and client:
        try:
            result = client.table("projects").insert(project_data).execute()
            return result.data[0] if result.data else None
        except Exception:
            pass
    
    return project_data


# ─────────────────────────────────────────────────────────────────
# AGENT MEMORY OPERATIONS
# ─────────────────────────────────────────────────────────────────

async def get_agent_memory(user_id: str):
    """Get agent memory for a user."""
    client = get_supabase_anon()
    
    if is_connected() and client:
        try:
            result = client.table("agent_memory").select("*").eq("user_id", user_id).maybe_single().execute()
            return result.data
        except Exception:
            pass
    
    return _memory.get(user_id)


async def upsert_agent_memory(memory: dict):
    """Create or update agent memory."""
    client = get_supabase_service()
    
    if is_connected() and client:
        try:
            result = client.table("agent_memory").upsert(memory, on_conflict="user_id").execute()
            return result.data[0] if result.data else None
        except Exception:
            pass
    
    _memory[memory["user_id"]] = memory
    return memory


# ─────────────────────────────────────────────────────────────────
# SESSION OPERATIONS
# ─────────────────────────────────────────────────────────────────

async def create_session(session_data: dict):
    """Create a new session."""
    import uuid
    client = get_supabase_service()
    session_data.setdefault("id", str(uuid.uuid4()))
    session_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if is_connected() and client:
        try:
            result = client.table("sessions").insert(session_data).execute()
            return result.data[0] if result.data else None
        except Exception:
            pass
    
    _sessions[session_data["id"]] = session_data
    return session_data


async def get_session(session_id: str):
    """Get a session by ID."""
    client = get_supabase_anon()
    
    if is_connected() and client:
        try:
            result = client.table("sessions").select("*").eq("id", session_id).maybe_single().execute()
            return result.data
        except Exception:
            pass
    
    return _sessions.get(session_id)


async def append_session_message(session_id: str, message: dict):
    """Append a message to a session."""
    client = get_supabase_service()
    
    # Get current messages
    session = await get_session(session_id)
    if not session:
        return
    
    messages = session.get("messages", [])
    messages.append(message)
    
    if is_connected() and client:
        try:
            client.table("sessions").update({"messages": messages, "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", session_id).execute()
            return
        except Exception:
            pass
    
    # Fallback to in-memory
    if session_id in _sessions:
        _sessions[session_id]["messages"] = messages
        _sessions[session_id]["updated_at"] = datetime.now(timezone.utc).isoformat()


async def close_session(session_id: str):
    """Close a session."""
    client = get_supabase_service()
    
    if is_connected() and client:
        try:
            client.table("sessions").update({
                "ended_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", session_id).execute()
            return
        except Exception:
            pass
    
    # Fallback to in-memory
    if session_id in _sessions:
        _sessions[session_id]["ended_at"] = datetime.now(timezone.utc).isoformat()
        _sessions[session_id]["updated_at"] = datetime.now(timezone.utc).isoformat()


async def get_daily_analytics(user_id: str, date: str = None) -> dict | None:
    """Get daily analytics."""
    client = get_supabase_anon()
    
    if is_connected() and client and date:
        try:
            result = client.table("daily_analytics").select("*").eq("user_id", user_id).eq("analytics_date", date).maybe_single().execute()
            return result.data
        except Exception:
            pass
    
    return None


async def upsert_daily_analytics(analytics: dict):
    """Create or update daily analytics."""
    client = get_supabase_service()
    
    if is_connected() and client:
        try:
            result = client.table("daily_analytics").upsert(analytics, on_conflict="user_id,analytics_date").execute()
            return result.data[0] if result.data else None
        except Exception:
            pass
    
    return analytics


# Legacy compatibility
def get_supabase_client():
    return get_supabase_anon()