"""Agent memory - tracks user patterns and estimation accuracy."""
import logging
from datetime import datetime, timezone, timedelta
from app.services.supabase_service import (
    get_agent_memory,
    upsert_agent_memory,
    get_task,
    get_daily_analytics,
    upsert_daily_analytics,
    get_tasks,
    get_user_profile,
)

logger = logging.getLogger(__name__)


async def get_student_profile(user_id: str) -> dict | None:
    """Alias for get_user_profile for compatibility."""
    return await get_user_profile(user_id)


async def create_new_session(user_id: str, **kwargs) -> dict | None:
    """Create a new session for tracking conversation history."""
    from app.services.supabase_service import create_session
    
    title = kwargs.get("title", "New session")
    session_type = kwargs.get("session_type", "chat")
    
    session_data = {
        "user_id": user_id,
        "title": title,
        "session_type": session_type,
        "messages": [],
    }
    return await create_session(session_data)


async def append_message(session_id: str, message: dict) -> None:
    """Append a message to session history."""
    from app.services.supabase_service import append_session_message
    await append_session_message(session_id, message)


async def get_session_history(session_id: str) -> list[dict]:
    """Get session message history."""
    from app.services.supabase_service import get_session
    session = await get_session(session_id)
    return session.get("messages", []) if session else []


async def update_session_title(session_id: str, message: str) -> None:
    """Update session title from first message."""
    from app.services.supabase_service import get_session
    from app.services.supabase_service import get_supabase_client
    
    session = await get_session(session_id)
    if not session:
        return
    
    # Use first few words of message as title
    title = message[:50] + "..." if len(message) > 50 else message
    
    client = get_supabase_client()
    client.table("sessions").update({"title": title}).eq("id", session_id).execute()


async def close_session(session_id: str) -> None:
    """Close a session."""
    from app.services.supabase_service import close_session
    await close_session(session_id)


async def update_memory_on_complete(user_id: str, task_id: str) -> None:
    """
    Update agent memory when a task is completed.
    Tracks estimation accuracy over time.
    """
    task = await get_task(task_id)
    if not task:
        return
    
    estimated = task.get("estimated_hours")
    actual = task.get("actual_hours")
    
    if not estimated or not actual:
        return
    
    # Calculate bias (actual / estimated)
    bias = actual / estimated if estimated > 0 else 1.0
    
    # Get current memory
    memory = await get_agent_memory(user_id)
    if not memory:
        memory = {
            "user_id": user_id,
            "patterns": {"estimation_history": []},
            "completion_history": {"last_30_days": []},
            "estimation_bias": 1.0,
            "frequently_missed_categories": [],
        }
    
    # Update estimation history
    estimation_history = memory.get("patterns", {}).get("estimation_history", [])
    estimation_history.append({
        "task_id": task_id,
        "estimated": estimated,
        "actual": actual,
        "bias": bias,
        "completed_at": datetime.now(timezone.utc).isoformat(),
    })
    
    # Keep only last 30 entries
    estimation_history = estimation_history[-30:]
    
    # Calculate new average bias
    if estimation_history:
        avg_bias = sum(e["bias"] for e in estimation_history) / len(estimation_history)
    else:
        avg_bias = 1.0
    
    # Update frequently missed categories based on bias > 1.2
    frequently_missed = memory.get("frequently_missed_categories", [])
    if bias > 1.2:
        category = task.get("tags", ["general"])[0] if task.get("tags") else "general"
        if category not in frequently_missed:
            frequently_missed.append(category)
    
    # Update memory
    memory["patterns"]["estimation_history"] = estimation_history
    memory["estimation_bias"] = round(avg_bias, 2)
    memory["frequently_missed_categories"] = frequently_missed[-5:]  # Keep last 5
    memory["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await upsert_agent_memory(memory)
    
    # Also update daily analytics
    today = datetime.now(timezone.utc).date().iso_string()
    analytics = await get_daily_analytics(user_id, today)
    
    if analytics:
        analytics["tasks_completed"] = analytics.get("tasks_completed", 0) + 1
        analytics["actual_hours"] = (analytics.get("actual_hours", 0) or 0) + actual
        
        # Update streak
        prev_streak = analytics.get("streak_days", 0)
        analytics["streak_days"] = prev_streak + 1
        
        await upsert_daily_analytics(analytics)
    else:
        # Create new daily record
        await upsert_daily_analytics({
            "user_id": user_id,
            "analytics_date": today,
            "tasks_completed": 1,
            "tasks_pending": len(await get_tasks(user_id, status="pending")),
            "actual_hours": actual,
            "productivity_score": 7.0,
            "streak_days": 1,
        })


async def get_pattern_note(user_id: str) -> str | None:
    """Get a contextual note based on learned patterns."""
    memory = await get_agent_memory(user_id)
    if not memory:
        return None
    
    bias = memory.get("estimation_bias", 1.0)
    frequently_missed = memory.get("frequently_missed_categories", [])
    
    notes = []
    
    # Estimation bias note
    if bias > 1.3:
        notes.append(f"You typically underestimate tasks by {int((bias - 1) * 100)}%. I've adjusted estimates.")
    elif bias < 0.9:
        notes.append(f"You typically overestimate by {int((1 - bias) * 100)}%. Nice accuracy!")
    
    # Frequently missed categories
    if frequently_missed:
        notes.append(f"Watch out for: {', '.join(frequently_missed[:2])}")
    
    return " | ".join(notes) if notes else None