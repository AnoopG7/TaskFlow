"""Scheduler service - APScheduler for proactive triggers."""
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


def get_scheduler() -> AsyncIOScheduler:
    """Get scheduler singleton."""
    global _scheduler
    if _scheduler is None:
        _scheduler = AsyncIOScheduler(timezone=timezone.utc)
    return _scheduler


async def send_morning_brief():
    """Send morning brief to all active users."""
    from app.agent.loop import run_morning_brief
    from app.services.supabase_service import get_supabase_client
    
    logger.info("🌅 Running morning brief job...")
    
    client = get_supabase_client()
    
    # Get all users who have morning briefs enabled
    try:
        result = client.table("user_profiles").select("user_id, brief_time, notification_channels").execute()
        
        for profile in result.data or []:
            user_id = profile.get("user_id")
            channels = profile.get("notification_channels", {})
            
            if not user_id:
                continue
            
            # Run brief
            try:
                result = await run_morning_brief(user_id)
                response = result.get("response", "")
                
                # Send via Telegram if configured
                if channels.get("primary") == "telegram":
                    from app.services.telegram_service import send_message
                    await send_message(user_id, response)
                    
            except Exception as e:
                logger.error(f"Morning brief failed for {user_id}: {e}")
                
    except Exception as e:
        logger.error(f"Morning brief job failed: {e}")


async def send_evening_debrief():
    """Send end-of-day debrief to all active users."""
    from app.agent.loop import run_evening_debrief
    from app.services.supabase_service import get_supabase_client
    
    logger.info("🌙 Running evening debrief job...")
    
    client = get_supabase_client()
    
    try:
        result = client.table("user_profiles").select("user_id, notification_channels").execute()
        
        for profile in result.data or []:
            user_id = profile.get("user_id")
            channels = profile.get("notification_channels", {})
            
            if not user_id:
                continue
            
            try:
                result = await run_evening_debrief(user_id)
                response = result.get("response", "")
                
                if channels.get("primary") == "telegram":
                    from app.services.telegram_service import send_message
                    await send_message(user_id, response)
                    
            except Exception as e:
                logger.error(f"Evening debrief failed for {user_id}: {e}")
                
    except Exception as e:
        logger.error(f"Evening debrief job failed: {e}")


async def scan_deadline_risks():
    """Scan for tasks at risk of missing deadlines."""
    from app.agent.loop import run_agent
    from app.services.supabase_service import get_supabase_client
    from datetime import datetime, timedelta
    
    logger.info("⚠️ Running deadline risk scan...")
    
    client = get_supabase_client()
    
    # Find tasks due within 24h with no progress
    tomorrow = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    
    try:
        result = (
            client.table("tasks")
            .select("id, user_id, title, due_date, status, priority")
            .lte("due_date", tomorrow)
            .eq("status", "pending")
            .execute()
        )
        
        at_risk_tasks = {}
        
        for task in result.data or []:
            user_id = task.get("user_id")
            task_id = task.get("id")
            
            if not user_id:
                continue
            
            # Track user tasks
            if user_id not in at_risk_tasks:
                at_risk_tasks[user_id] = []
            at_risk_tasks[user_id].append(task)
        
        # Notify each user
        for user_id, tasks in at_risk_tasks.items():
            try:
                task_list = "\n".join(f"- {t['title']}" for t in tasks[:3])
                message = f"⚠️ *Deadline Alert*\n\nThese tasks are due within 24 hours:\n{task_list}"
                
                await run_agent(user_id, message=message, trigger_type="risk_alert")
                
            except Exception as e:
                logger.error(f"Risk notification failed for {user_id}: {e}")
                
    except Exception as e:
        logger.error(f"Risk scan job failed: {e}")


def start_scheduler() -> None:
    """Start the scheduler with all jobs."""
    scheduler = get_scheduler()
    
    # Morning brief - 7 AM daily
    scheduler.add_job(
        send_morning_brief,
        CronTrigger(hour=7, minute=0),
        id="morning_brief",
        name="Morning Brief",
        replace_existing=True,
    )
    
    # Evening debrief - 6 PM daily
    scheduler.add_job(
        send_evening_debrief,
        CronTrigger(hour=18, minute=0),
        id="evening_debrief",
        name="Evening Debrief",
        replace_existing=True,
    )
    
    # Risk scan - 9 AM and 3 PM daily
    scheduler.add_job(
        scan_deadline_risks,
        CronTrigger(hour=9, minute=0),
        id="risk_scan_morning",
        name="Risk Scan AM",
        replace_existing=True,
    )
    scheduler.add_job(
        scan_deadline_risks,
        CronTrigger(hour=15, minute=0),
        id="risk_scan_afternoon",
        name="Risk Scan PM",
        replace_existing=True,
    )
    
    scheduler.start()
    logger.info("✅ Scheduler started with jobs: morning_brief, evening_debrief, risk_scan")


def stop_scheduler() -> None:
    """Stop the scheduler."""
    global _scheduler
    if _scheduler:
        _scheduler.shutdown()
        _scheduler = None
        logger.info("⏹️ Scheduler stopped")