"""
APScheduler-based task scheduler for proactive agent actions.
Handles morning briefs, evening debriefs, risk detection, and overload warnings.
"""

import logging
from datetime import datetime
from typing import Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

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

    async def schedule_morning_brief(self, user_id: str, time_str: str) -> str:
        """Schedule daily morning brief for user."""
        if not self.scheduler:
            logger.warning("Scheduler not started")
            return ""

        try:
            hour, minute = map(int, time_str.split(":"))

            job = self.scheduler.add_job(
                send_morning_brief,
                CronTrigger(hour=hour, minute=minute),
                args=[user_id],
                id=f"morning_brief_{user_id}",
                replace_existing=True,
            )

            logger.info(f"✅ Morning brief scheduled for {user_id} at {time_str}")
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


async def setup_user_schedules(user_id: str):
    """Setup scheduled tasks for a user."""
    from app.services.supabase_service import get_agent_preferences

    logger.info(f"Setting up schedules for {user_id}")

    try:
        prefs = await get_agent_preferences(user_id)

        if prefs.get("enable_morning_brief"):
            await scheduler.schedule_morning_brief(user_id, prefs.get("morning_brief_time", "07:00"))

        logger.info(f"✅ Schedules setup for {user_id}")

    except Exception as e:
        logger.error(f"Error setting up schedules: {e}")


# ─── Lifecycle Functions ─────────────────────────────────────────────

async def start_scheduler():
    """Start the global scheduler."""
    await scheduler.start()


async def stop_scheduler():
    """Stop the global scheduler."""
    await scheduler.stop()
