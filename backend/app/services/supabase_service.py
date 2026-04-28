"""
Supabase service — all database operations.
Dual-client pattern: anon key (reads), service role (writes, bypasses RLS).
In-memory fallback for local dev without Supabase.
"""

from supabase import create_client, Client
from supabase.lib.client_options import SyncClientOptions
from app.config import get_settings
import logging
from datetime import datetime, timezone
import uuid
import httpx

logger = logging.getLogger(__name__)

# HTTP client with timeout to prevent hangs
_http_client = httpx.Client(timeout=10.0)
_client_options = SyncClientOptions(httpx_client=_http_client)

# Two clients: one with anon key (reads), one with service role (writes)
_client_anon: Client | None = None
_client_service: Client | None = None
_is_connected: bool | None = None

# In-memory fallback for dev
_tasks: dict[str, list[dict]] = {}
_profiles: dict[str, dict] = {}
_memory: dict[str, dict] = {}
_sessions: dict[str, dict] = {}


def _now_iso() -> str:
    """Current UTC timestamp as ISO string."""
    return datetime.now(timezone.utc).isoformat()


def init_supabase() -> None:
    """Initialize Supabase clients."""
    global _client_anon, _client_service, _is_connected
    settings = get_settings()

    if not settings.supabase_url or not settings.supabase_key:
        logger.warning("Supabase not configured - using in-memory store")
        return

    _client_anon = create_client(settings.supabase_url, settings.supabase_key, options=_client_options)

    if settings.supabase_service_role_key:
        _client_service = create_client(settings.supabase_url, settings.supabase_service_role_key, options=_client_options)
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
        except Exception as e:
            logger.warning(f"get_user_profile error: {e}")

    return _profiles.get(user_id)


async def upsert_user_profile(profile: dict):
    """Create or update user profile."""
    client = get_supabase_service()
    profile["updated_at"] = _now_iso()

    if is_connected() and client:
        try:
            result = client.table("user_profiles").upsert(profile, on_conflict="user_id").execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.warning(f"upsert_user_profile error: {e}")

    _profiles[profile["user_id"]] = profile
    return profile


# ─────────────────────────────────────────────────────────────────
# TASK OPERATIONS
# ─────────────────────────────────────────────────────────────────

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
            result = query.order("created_at", desc=True).execute()
            return result.data or []
        except Exception as e:
            logger.warning(f"get_tasks error: {e}")

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
        except Exception as e:
            logger.warning(f"get_task error: {e}")

    for tasks in _tasks.values():
        for t in tasks:
            if t.get("id") == task_id:
                return t
    return None


async def create_task(task_data: dict):
    """Create a new task."""
    client = get_supabase_service()

    if "id" not in task_data:
        task_data["id"] = str(uuid.uuid4())

    if is_connected() and client:
        try:
            result = client.table("tasks").insert(task_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.warning(f"create_task error: {e}")

    user_id = task_data.get("user_id")
    if user_id not in _tasks:
        _tasks[user_id] = []
    _tasks[user_id].append(task_data)
    return task_data


async def update_task(task_id: str, task_data: dict):
    """Update an existing task."""
    client = get_supabase_service()
    task_data["updated_at"] = _now_iso()

    if is_connected() and client:
        try:
            result = client.table("tasks").update(task_data).eq("id", task_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.warning(f"update_task error: {e}")

    for tasks in _tasks.values():
        for i, t in enumerate(tasks):
            if t.get("id") == task_id:
                tasks[i].update(task_data)
                return tasks[i]
    return None


async def complete_task(task_id: str, actual_hours: float = None):
    """Mark a task as completed."""
    update_data = {
        "status": "completed",
        "completed_date": _now_iso(),
    }
    if actual_hours is not None:
        update_data["actual_hours"] = actual_hours

    return await update_task(task_id, update_data)


async def delete_task(task_id: str) -> bool:
    """Delete a task."""
    client = get_supabase_service()

    if is_connected() and client:
        try:
            result = client.table("tasks").delete().eq("id", task_id).execute()
            return bool(result.data)
        except Exception as e:
            logger.warning(f"delete_task error: {e}")

    for tasks in _tasks.values():
        for i, t in enumerate(tasks):
            if t.get("id") == task_id:
                tasks.pop(i)
                return True
    return False


async def search_tasks(user_id: str, query: str, exclude_project_id: str | None = None) -> list[dict]:
    """Search tasks by title/description with optional project exclusion."""
    client = get_supabase_service()

    if is_connected() and client:
        try:
            # Sanitize query for ilike
            safe_query = query.replace("%", "").replace("_", "\\_").strip()
            if not safe_query:
                return []

            q = (
                client.table("tasks")
                .select("*")
                .eq("user_id", user_id)
                .ilike("title", f"%{safe_query}%")
                .limit(30)
            )
            if exclude_project_id:
                q = q.neq("project_id", exclude_project_id)
            result = q.execute()

            # Also search by description (separate query, merge results)
            q2 = (
                client.table("tasks")
                .select("*")
                .eq("user_id", user_id)
                .ilike("description", f"%{safe_query}%")
                .limit(30)
            )
            if exclude_project_id:
                q2 = q2.neq("project_id", exclude_project_id)
            result2 = q2.execute()

            # Merge and deduplicate
            seen_ids = set()
            merged = []
            for t in (result.data or []) + (result2.data or []):
                if t["id"] not in seen_ids:
                    seen_ids.add(t["id"])
                    merged.append(t)
            return merged[:30]
        except Exception as e:
            logger.warning(f"search_tasks error: {e}")

    # Fallback: in-memory search
    tasks = _tasks.get(user_id, [])
    q_lower = query.lower()
    results = [
        t for t in tasks
        if q_lower in t.get("title", "").lower() or q_lower in (t.get("description") or "").lower()
    ]
    if exclude_project_id:
        results = [t for t in results if t.get("project_id") != exclude_project_id]
    return results[:30]


# ─────────────────────────────────────────────────────────────────
# BATCH TASK OPERATIONS
# ─────────────────────────────────────────────────────────────────

async def batch_complete_tasks(task_ids: list[str], user_id: str, actual_hours: float | None = None) -> dict:
    """Complete multiple tasks at once."""
    client = get_supabase_service()

    if not task_ids:
        return {"success": False, "completed": 0, "error": "No task IDs provided"}

    update_data = {
        "status": "completed",
        "completed_date": _now_iso(),
        "updated_at": _now_iso(),
    }
    if actual_hours is not None:
        update_data["actual_hours"] = actual_hours

    if is_connected() and client:
        try:
            result = client.table("tasks").update(update_data).in_("id", task_ids).eq("user_id", user_id).execute()
            completed = len(result.data) if result.data else 0
            return {"success": True, "completed": completed, "tasks": result.data or []}
        except Exception as e:
            logger.error(f"batch_complete error: {e}")
            return {"success": False, "completed": 0, "error": str(e)}

    return {"success": False, "completed": 0, "error": "Database not connected"}


async def batch_update_priority(task_ids: list[str], user_id: str, priority: str) -> dict:
    """Update priority for multiple tasks."""
    client = get_supabase_service()

    if priority not in ["low", "medium", "high", "critical"]:
        return {"success": False, "updated": 0, "error": "Invalid priority"}

    if is_connected() and client:
        try:
            result = (
                client.table("tasks")
                .update({"priority": priority, "updated_at": _now_iso()})
                .in_("id", task_ids)
                .eq("user_id", user_id)
                .execute()
            )
            updated = len(result.data) if result.data else 0
            return {"success": True, "updated": updated, "priority": priority}
        except Exception as e:
            logger.error(f"batch_update_priority error: {e}")
            return {"success": False, "updated": 0, "error": str(e)}

    return {"success": False, "updated": 0, "error": "Database not connected"}


# ─────────────────────────────────────────────────────────────────
# PROJECT OPERATIONS
# ─────────────────────────────────────────────────────────────────

async def get_projects(user_id: str):
    """Get all projects for a user."""
    client = get_supabase_anon()

    if is_connected() and client:
        try:
            result = client.table("projects").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
            return result.data or []
        except Exception as e:
            logger.warning(f"get_projects error: {e}")

    return []


async def create_project(project_data: dict):
    """Create a new project."""
    client = get_supabase_service()

    if "id" not in project_data:
        project_data["id"] = str(uuid.uuid4())

    if is_connected() and client:
        try:
            result = client.table("projects").insert(project_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.warning(f"create_project error: {e}")

    return project_data


async def get_project(project_id: str, user_id: str) -> dict | None:
    """Get single project by ID with ownership validation."""
    client = get_supabase_anon()

    if is_connected() and client:
        try:
            result = client.table("projects").select("*").eq("id", project_id).eq("user_id", user_id).maybe_single().execute()
            return result.data
        except Exception as e:
            logger.error(f"get_project error: {e}")

    return None


async def update_project(project_id: str, user_id: str, updates: dict) -> dict | None:
    """Update project fields with ownership validation."""
    client = get_supabase_service()

    if is_connected() and client:
        try:
            # Verify ownership first
            existing = client.table("projects").select("id").eq("id", project_id).eq("user_id", user_id).maybe_single().execute()
            if not existing.data:
                return None

            updates["updated_at"] = _now_iso()
            result = client.table("projects").update(updates).eq("id", project_id).eq("user_id", user_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"update_project error: {e}")

    return None


async def delete_project(project_id: str, user_id: str, cascade: bool = True) -> bool:
    """Delete project. If cascade, unlink tasks (set project_id to NULL)."""
    client = get_supabase_service()

    if is_connected() and client:
        try:
            if cascade:
                client.table("tasks").update({"project_id": None}).eq("project_id", project_id).execute()

            client.table("projects").delete().eq("id", project_id).eq("user_id", user_id).execute()
            return True
        except Exception as e:
            logger.error(f"delete_project error: {e}")

    return False


async def get_tasks_by_project(project_id: str, user_id: str, status: str | None = None, priority: str | None = None) -> list[dict]:
    """Get tasks for a project with optional filters."""
    client = get_supabase_anon()

    if is_connected() and client:
        try:
            query = client.table("tasks").select("*").eq("project_id", project_id).eq("user_id", user_id)
            if status:
                query = query.eq("status", status)
            if priority:
                query = query.eq("priority", priority)
            result = query.order("created_at", desc=True).execute()
            return result.data or []
        except Exception as e:
            logger.error(f"get_tasks_by_project error: {e}")

    return []


async def link_tasks_to_project(project_id: str, task_ids: list[str], user_id: str) -> dict:
    """Link existing tasks to a project by updating their project_id."""
    client = get_supabase_service()

    if is_connected() and client:
        try:
            # Verify project ownership
            project = await get_project(project_id, user_id)
            if not project:
                return {"success": False, "linked": 0, "error": "Project not found"}

            result = (
                client.table("tasks")
                .update({"project_id": project_id, "updated_at": _now_iso()})
                .in_("id", task_ids)
                .eq("user_id", user_id)
                .execute()
            )
            linked = len(result.data) if result.data else 0
            return {"success": True, "linked": linked, "tasks": result.data or []}
        except Exception as e:
            logger.error(f"link_tasks_to_project error: {e}")
            return {"success": False, "linked": 0, "error": str(e)}

    return {"success": False, "linked": 0, "error": "Database not connected"}


async def unlink_task_from_project(task_id: str, user_id: str) -> bool:
    """Remove task from its project (set project_id = null)."""
    client = get_supabase_service()

    if is_connected() and client:
        try:
            result = (
                client.table("tasks")
                .update({"project_id": None, "updated_at": _now_iso()})
                .eq("id", task_id)
                .eq("user_id", user_id)
                .execute()
            )
            return bool(result.data)
        except Exception as e:
            logger.error(f"unlink_task error: {e}")

    return False


async def get_project_analytics(project_id: str, user_id: str) -> dict:
    """Compute project statistics live from tasks table."""
    tasks = await get_tasks_by_project(project_id, user_id)
    completed = len([t for t in tasks if t.get("status") == "completed"])
    total = len(tasks)

    return {
        "project_id": project_id,
        "total_tasks": total,
        "completed_tasks": completed,
        "pending_tasks": len([t for t in tasks if t.get("status") == "pending"]),
        "in_progress_tasks": len([t for t in tasks if t.get("status") == "in_progress"]),
        "cancelled_tasks": len([t for t in tasks if t.get("status") == "cancelled"]),
        "completion_percentage": round((completed / total * 100) if total > 0 else 0, 2),
        "estimated_hours_completed": sum(t.get("estimated_hours") or 0 for t in tasks if t.get("status") == "completed"),
        "actual_hours_completed": sum(t.get("actual_hours") or 0 for t in tasks if t.get("status") == "completed"),
    }


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
    memory["updated_at"] = _now_iso()

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
    client = get_supabase_service()
    session_data.setdefault("id", str(uuid.uuid4()))
    session_data["updated_at"] = _now_iso()

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


async def get_sessions(user_id: str, limit: int = 20) -> list[dict]:
    """Get recent sessions for a user."""
    client = get_supabase_anon()

    if is_connected() and client:
        try:
            result = (
                client.table("sessions")
                .select("*")
                .eq("user_id", user_id)
                .order("started_at", desc=True)
                .limit(limit)
                .execute()
            )
            return result.data or []
        except Exception:
            pass

    return [s for s in _sessions.values() if s.get("user_id") == user_id][:limit]


async def append_session_message(session_id: str, message: dict):
    """Append a message to a session's JSONB messages array."""
    client = get_supabase_service()

    session = await get_session(session_id)
    if not session:
        return

    messages = session.get("messages", []) or []
    messages.append(message)

    if is_connected() and client:
        try:
            client.table("sessions").update({
                "messages": messages,
                "updated_at": _now_iso(),
            }).eq("id", session_id).execute()
            return
        except Exception:
            pass

    if session_id in _sessions:
        _sessions[session_id]["messages"] = messages
        _sessions[session_id]["updated_at"] = _now_iso()


async def close_session(session_id: str):
    """Close a session."""
    client = get_supabase_service()

    if is_connected() and client:
        try:
            client.table("sessions").update({
                "ended_at": _now_iso(),
                "updated_at": _now_iso(),
            }).eq("id", session_id).execute()
            return
        except Exception:
            pass

    if session_id in _sessions:
        _sessions[session_id]["ended_at"] = _now_iso()
        _sessions[session_id]["updated_at"] = _now_iso()


# ─────────────────────────────────────────────────────────────────
# DAILY ANALYTICS
# ─────────────────────────────────────────────────────────────────

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


# ─────────────────────────────────────────────────────────────────
# AGENT PREFERENCES
# ─────────────────────────────────────────────────────────────────

_AGENT_PREF_DEFAULTS = {
    "notification_enabled": True,
    "notification_channels": {"primary": "telegram", "secondary": "email"},
    "dnd_enabled": False,
    "dnd_start": "20:00",
    "dnd_end": "08:00",
    "morning_brief_time": "07:00",
    "custom_agent_instructions": "",
    "telegram_chat_id": None,
    "telegram_notifications_enabled": True,
    "enable_morning_brief": True,
    "enable_evening_debrief": True,
    "enable_risk_detection": True,
    "enable_overload_warnings": True,
}


async def get_agent_preferences(user_id: str) -> dict:
    """Get agent preferences with defaults fallback."""
    client = get_supabase_anon()

    if is_connected() and client:
        try:
            result = client.table("agent_preferences").select("*").eq("user_id", user_id).maybe_single().execute()
            if result.data:
                return result.data
        except Exception as e:
            logger.warning(f"get_agent_preferences error: {e}")

    return {"user_id": user_id, **_AGENT_PREF_DEFAULTS}


async def update_agent_preferences(user_id: str, updates: dict) -> dict:
    """Upsert agent preferences."""
    client = get_supabase_service()

    if is_connected() and client:
        try:
            updates["user_id"] = user_id
            updates["updated_at"] = _now_iso()
            result = client.table("agent_preferences").upsert(updates, on_conflict="user_id").execute()
            if result.data:
                return result.data[0] if isinstance(result.data, list) else result.data
        except Exception as e:
            logger.error(f"update_agent_preferences error: {e}")

    return {"user_id": user_id, **updates}


async def reset_agent_preferences(user_id: str) -> dict:
    """Reset agent preferences to defaults."""
    return await update_agent_preferences(user_id, {**_AGENT_PREF_DEFAULTS})


# ─────────────────────────────────────────────────────────────────
# TASK STATUS TRANSITIONS (Audit Log)
# ─────────────────────────────────────────────────────────────────

async def log_status_transition(task_id: str, from_status: str, to_status: str, user_id: str, reason: str | None = None) -> bool:
    """Log status transition for audit trail."""
    client = get_supabase_service()

    transition_data = {
        "task_id": task_id,
        "from_status": from_status,
        "to_status": to_status,
        "changed_by": user_id,
        "reason": reason,
    }

    if is_connected() and client:
        try:
            client.table("task_status_transitions").insert(transition_data).execute()
            return True
        except Exception as e:
            logger.error(f"log_status_transition error: {e}")

    return False


async def get_task_status_history(task_id: str, limit: int = 50) -> list[dict]:
    """Get status change history for a task."""
    client = get_supabase_anon()

    if is_connected() and client:
        try:
            result = (
                client.table("task_status_transitions")
                .select("*")
                .eq("task_id", task_id)
                .order("changed_at", desc=True)
                .limit(limit)
                .execute()
            )
            return result.data or []
        except Exception as e:
            logger.error(f"get_task_status_history error: {e}")

    return []