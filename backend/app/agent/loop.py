"""TaskFlow Agent - Main orchestrator (TutorX-inspired single LLM call)."""
import json
import logging
from pathlib import Path
from datetime import datetime, timezone
from app.agent.parser import parse_llm_response, ParsedAction
from app.agent.memory import (
    get_student_profile,
    create_new_session,
    append_message,
    get_session_history,
)
from app.config import get_settings
from app.services.supabase_service import (
    get_tasks,
    get_user_profile,
    create_task,
    complete_task,
    create_session,
    get_session,
    get_agent_memory,
)
from app.services import groq_service

logger = logging.getLogger(__name__)
settings = get_settings()

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"


def _get_current_date() -> str:
    """Get current date and time in ISO format."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def _load_prompt_template() -> str:
    """Load system prompt template from file."""
    try:
        path = PROMPTS_DIR / "system_prompt_v1.txt"
        return path.read_text()
    except FileNotFoundError:
        logger.warning("Prompt template not found, using fallback")
        return "You are TaskFlow, a proactive task management assistant."

PROMPT_TEMPLATE = _load_prompt_template()


async def _get_or_create_profile(user_id: str) -> dict:
    """Get existing profile or create a minimal default."""
    try:
        profile = await get_user_profile(user_id)
        if profile:
            return profile
    except Exception as e:
        logger.warning(f"get_user_profile failed: {e}")

    logger.info(f"Auto-creating profile for user {user_id}")
    default = {
        "user_id": user_id,
        "name": "User",
        "timezone": "IST",
        "work_hours": {"start": 9, "end": 17},
        "notification_channels": {"primary": "telegram", "secondary": "email"},
        "do_not_disturb": {"enabled": False, "start": "20:00", "end": "08:00"},
        "brief_time": "07:00",
    }

    try:
        from app.services.supabase_service import upsert_user_profile
        result = await upsert_user_profile(default)
        if result:
            return result
    except Exception as e:
        logger.warning(f"Profile upsert failed: {e}")

    return default


async def _get_or_create_memory(user_id: str) -> dict:
    """Get existing agent memory or create default."""
    try:
        memory = await get_agent_memory(user_id)
        if memory:
            return memory
    except Exception:
        pass

    default = {
        "user_id": user_id,
        "patterns": {"productive_days": [], "estimation_history": []},
        "completion_history": {"last_30_days": []},
        "estimation_bias": 1.0,
        "frequently_missed_categories": [],
    }

    try:
        from app.services.supabase_service import upsert_agent_memory
        result = await upsert_agent_memory(default)
        if result:
            return result
    except Exception:
        pass

    return default


def _build_context(
    message: str | None,
    profile: dict,
    tasks: list[dict],
    memory: dict,
    history: list[dict],
    trigger_type: str | None = None,
) -> list[dict]:
    """Build the full prompt context for a single LLM call."""
    name = profile.get("name", "User")
    work_hours = profile.get("work_hours", {"start": 9, "end": 17})
    timezone = profile.get("timezone", "IST")
    bias = memory.get("estimation_bias", 1.0)
    current_date = _get_current_date()

    work_hours_str = f"{work_hours['start']}:00 - {work_hours['end']}:00"

    task_list = []
    for t in tasks[:10]:
        due = t.get("due_date", "No due date")[:16] if t.get("due_date") else "No due date"
        task_list.append(
            f"- [{t.get('priority', 'medium')}] {t.get('title')} (due: {due}, "
            f"est: {t.get('estimated_hours', '?')}h)"
        )
    task_list_str = "\n".join(task_list) if task_list else "No pending tasks"

    history_str = ""
    for msg in history[-4:]:
        role = msg.get("role", "user")
        content = msg.get("content", "")[:100]
        history_str += f"\n{role}: {content}"

    # Build system message manually instead of using .format()
    system_content = f"""{PROMPT_TEMPLATE}

User's name: {name}
Current date & time (UTC): {current_date}
User timezone: {timezone}
Work hours ({timezone}): {work_hours_str}
Estimation bias: {bias}x

User's current tasks:
{task_list_str}

Recent conversation:{history_str}

The user's message: {message or 'Generate a morning brief'}

Respond with valid JSON in the specified format."""

    return [
        {"role": "system", "content": system_content},
    ]


async def run_agent(
    user_id: str,
    message: str | None = None,
    trigger_type: str | None = None,
    session_id: str | None = None,
) -> dict:
    """
    Main entry point - single LLM call per request (TutorX pattern).
    
    Returns:
        {
            "response": str,
            "actions": dict,
            "session_id": str | None,
        }
    """
    profile = await _get_or_create_profile(user_id)
    memory = await _get_or_create_memory(user_id)
    
    tasks = await get_tasks(user_id, status="pending")

    retrieved_session_id = None
    history = []
    try:
        if session_id:
            session = await get_session(session_id)
            if session:
                retrieved_session_id = session_id
                history = session.get("messages", []) or []
        else:
            session = await create_session({
                "user_id": user_id,
                "title": f"{trigger_type or 'chat'} session",
                "session_type": trigger_type or "chat",
                "messages": [],
            })
            if session:
                retrieved_session_id = session["id"]
    except Exception as e:
        logger.warning(f"Session setup failed: {e}")

    context = _build_context(message, profile, tasks, memory, history, trigger_type)

    try:
        response_text = await groq_service.complete(
            messages=context,
            temperature=0.7,
            max_tokens=1024,
        )
    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        return {
            "response": "I couldn't process that right now. Please try again!",
            "actions": {},
            "session_id": retrieved_session_id,
        }

    parsed = parse_llm_response(response_text, profile)

    # Execute actions if present
    if parsed.intent == "create_task" and parsed.task_data:
        task_data = parsed.task_data.copy()
        task_data["user_id"] = user_id
        task_data["status"] = "pending"
        try:
            created = await create_task(task_data)
            if created:
                logger.info(f"✅ Created task: {created.get('title')}")
        except Exception as e:
            logger.error(f"Task creation failed: {e}")

    return {
        "response": parsed.response_text or response_text,
        "actions": parsed.model_dump(),
        "session_id": retrieved_session_id,
    }


async def run_morning_brief(user_id: str) -> dict:
    """Generate and return morning brief."""
    return await run_agent(user_id, trigger_type="morning_brief")


async def run_evening_debrief(user_id: str) -> dict:
    """Generate and return evening debrief."""
    return await run_agent(user_id, trigger_type="evening_debrief")