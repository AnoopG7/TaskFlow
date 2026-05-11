"""
APScheduler-based task scheduler for proactive agent actions.
Handles morning briefs, evening debriefs, risk detection, and overload warnings.
All times are in the user's local timezone.
"""

import logging
import pytz
from datetime import datetime, timezone
from typing import Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.utils.timezone_utils import resolve_timezone, get_pytz_timezone

logger = logging.getLogger(__name__)


class TaskScheduler:
    """Manages scheduled tasks for the agent."""

    def __init__(self):
        self.scheduler: Optional[AsyncIOScheduler] = None

    async def start(self):
        """Start the scheduler."""
        if self.scheduler is None:
            self.scheduler = AsyncIOScheduler()

        try:
            self.scheduler.start()
            logger.info("✅ Task scheduler started")
        except Exception as e:
            logger.error(f"Failed to start scheduler: {e}")
            raise

    async def stop(self):
        """Stop the scheduler."""
        if self.scheduler and self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("⏹️ Task scheduler stopped")

    async def schedule_morning_brief(self, user_id: str, time_str: str, user_timezone: str) -> str:
        """Schedule daily morning brief for user in their local timezone."""
        if not self.scheduler:
            logger.warning("Scheduler not started")
            return ""

        try:
            hour, minute = map(int, time_str.split(":"))
            tz = get_pytz_timezone(user_timezone)

            job = self.scheduler.add_job(
                send_morning_brief,
                CronTrigger(hour=hour, minute=minute, timezone=tz),
                args=[user_id],
                id=f"morning_brief_{user_id}",
                replace_existing=True,
            )

            logger.info(f"✅ Morning brief scheduled for {user_id} at {time_str} ({resolve_timezone(user_timezone)})")
            return job.id

        except Exception as e:
            logger.error(f"Error scheduling morning brief: {e}")
            return ""

    async def unschedule(self, job_id: str) -> bool:
        """Remove a scheduled job."""
        if not self.scheduler:
            return False

        try:
            self.scheduler.remove_job(job_id)
            logger.info(f"✅ Job removed: {job_id}")
            return True
        except Exception as e:
            logger.warning(f"Error removing job {job_id}: {e}")
            return False


# Global scheduler instance
scheduler = TaskScheduler()


# ─── Scheduled Task Handlers ─────────────────────────────────────────────


async def send_morning_brief(user_id: str):
    """Generate and send morning brief to user."""
    from app.services.supabase_service import (
        get_agent_preferences, get_tasks, get_user_profile,
        create_session, append_session_message,
    )
    from app.services.groq_service import complete

    logger.info(f"📋 Generating morning brief for {user_id}")

    try:
        # Get user prefs
        prefs = await get_agent_preferences(user_id)
        if not prefs.get("enable_morning_brief"):
            logger.info(f"Morning brief disabled for {user_id}")
            return

        # Get pending tasks
        tasks = await get_tasks(user_id, status="pending")
        profile = await get_user_profile(user_id)

        if not tasks:
            logger.info(f"No pending tasks for {user_id}, skipping brief")
            return

        # Generate brief using LLM
        task_list = "\n".join([f"- {t['title']} (est: {t.get('estimated_hours', '?')}h)" for t in tasks[:10]])

        prompt = f"""Generate concise morning brief for {profile.get('name', 'User')} with {len(tasks)} tasks.

Pending: {task_list}

Summary with top 3 + motivation (under 100w)"""

        messages = [{"role": "user", "content": prompt}]
        brief = await complete(messages, temperature=0.7, max_tokens=200)

        # Create session and log the brief
        session = await create_session({
            "user_id": user_id,
            "title": "Morning Brief",
            "session_type": "morning_brief",
            "messages": [],
        })
        if session:
            await append_session_message(session["id"], {"role": "assistant", "content": brief})

        logger.info(f"✅ Morning brief generated for {user_id}")

    except Exception as e:
        logger.error(f"Error generating morning brief: {e}")


async def check_due_date_notifications(user_id: str):
    """Check for tasks due within 24 hours and send Telegram notification."""
    from app.services.supabase_service import (
        get_agent_preferences, get_tasks, get_user_profile,
    )
    from app.services.telegram_service import send_message

    logger.info(f"⏰ Checking due date notifications for {user_id}")

    try:
        prefs = await get_agent_preferences(user_id)
        telegram_chat_id = prefs.get("telegram_chat_id")
        if not telegram_chat_id:
            return

        profile = await get_user_profile(user_id)
        tasks = await get_tasks(user_id)

        # Use user's local timezone for comparison
        user_tz_str = profile.get("timezone") if profile else None
        user_tz = get_pytz_timezone(user_tz_str)
        now = datetime.now(user_tz)

        due_soon = []
        overdue = []

        for task in tasks:
            if task.get("status") in ("completed", "cancelled"):
                continue
            due_date = task.get("due_date")
            if not due_date:
                continue
            try:
                due_dt = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
                # Convert UTC to user's timezone
                due_local = due_dt.astimezone(user_tz)
                if due_local < now:
                    overdue.append(task)
                elif (due_local - now).total_seconds() <= 24 * 3600:
                    due_soon.append(task)
            except (ValueError, TypeError):
                continue

        if not overdue and not due_soon:
            return

        message = f"⏰ *Task Reminder for {profile.get('name', 'User')}*\n\n"

        if overdue:
            message += "🔴 *OVERDUE:*\n"
            for t in overdue:
                due = t.get("due_date", "?")[:16]
                message += f"• {t['title']} (was due: {due})\n"
            message += "\n"

        if due_soon:
            message += "🟡 *DUE WITHIN 24 HOURS:*\n"
            for t in due_soon:
                due = t.get("due_date", "?")[:16]
                message += f"• {t['title']} (due: {due})\n"
            message += "\n"

        message += f"Total: {len(overdue)} overdue, {len(due_soon)} due soon. Stay focused! 💪"

        await send_message(str(telegram_chat_id), message, parse_mode="Markdown")
        logger.info(f"✅ Due date notification sent to {user_id}")

    except Exception as e:
        logger.error(f"Error in due date notification for {user_id}: {e}")


async def schedule_due_date_check(user_id: str, user_timezone: str) -> str:
    """Schedule hourly due date check for user in their local timezone."""
    if not scheduler.scheduler:
        logger.warning("Scheduler not started")
        return ""

    try:
        tz = get_pytz_timezone(user_timezone)
        job = scheduler.scheduler.add_job(
            check_due_date_notifications,
            CronTrigger(hour="*/1", timezone=tz),
            args=[user_id],
            id=f"due_date_check_{user_id}",
            replace_existing=True,
        )

        logger.info(f"✅ Due date check scheduled for {user_id} (every hour, {resolve_timezone(user_timezone)})")
        return job.id

    except Exception as e:
        logger.error(f"Error scheduling due date check: {e}")
        return ""


async def setup_user_schedules(user_id: str):
    """Setup scheduled tasks for a user."""
    from app.services.supabase_service import get_agent_preferences, get_user_profile

    logger.info(f"Setting up schedules for {user_id}")

    try:
        prefs = await get_agent_preferences(user_id)
        profile = await get_user_profile(user_id)

        # Get user's timezone from profile, resolve to valid IANA name
        user_tz = resolve_timezone(profile.get("timezone")) if profile else "UTC"

        if prefs.get("enable_morning_brief"):
            await scheduler.schedule_morning_brief(user_id, prefs.get("morning_brief_time", "07:00"), user_tz)

        await schedule_due_date_check(user_id, user_tz)

        logger.info(f"✅ Schedules setup for {user_id} (timezone: {user_tz})")

    except Exception as e:
        logger.error(f"Error setting up schedules: {e}")


# ─── Lifecycle Functions ─────────────────────────────────────────────

async def start_scheduler():
    """Start the global scheduler."""
    await scheduler.start()


async def stop_scheduler():
    """Stop the global scheduler."""
    await scheduler.stop()
