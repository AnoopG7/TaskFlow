"""FastAPI application entry point."""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import os

from app.config import get_settings
from app.api.routes import tasks, agent, auth, projects

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: initialize services. Shutdown: cleanup."""
    from app.services.supabase_service import init_supabase, get_all_users
    from app.services.scheduler import start_scheduler, stop_scheduler, setup_user_schedules

    logger.info("🚀 TaskFlow starting up...")

    # Initialize Supabase
    try:
        init_supabase()
        logger.info("✅ Supabase connected")
    except Exception as e:
        logger.warning(f"Supabase connection: {e}")

    # Start scheduler
    try:
        await start_scheduler()
        logger.info("✅ Scheduler started")
    except Exception as e:
        logger.warning(f"Scheduler failed to start: {e}")

    # Setup schedules for all users (due date checks, etc.)
    try:
        all_users = await get_all_users()
        for user in all_users:
            user_id = user.get("user_id")
            if user_id:
                await setup_user_schedules(user_id)
        logger.info(f"✅ Schedules setup for {len(all_users)} users")
    except Exception as e:
        logger.warning(f"User schedules setup failed: {e}")

    # Setup Telegram
    try:
        from app.services.telegram_service import setup_webhook, start_polling
        settings = get_settings()
        if settings.environment == "production" or (settings.webhook_base_url and settings.webhook_base_url.startswith("https")):
            if await setup_webhook():
                logger.info(f"✅ Telegram webhook configured")
        else:
            import asyncio
            asyncio.create_task(start_polling())
            logger.info("📱 Telegram polling started (local dev mode)")
    except Exception as e:
        logger.warning(f"Telegram setup failed: {e}")

    logger.info("✅ TaskFlow ready")
    yield

    # Shutdown
    try:
        await stop_scheduler()
    except Exception as e:
        logger.warning(f"Scheduler shutdown: {e}")
    logger.info("🛑 TaskFlow shutting down")


settings = get_settings()

app = FastAPI(
    title="TaskFlow Agent",
    description="AI-powered proactive task management",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(tasks.router, prefix="/api/tasks", tags=["Tasks"])
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(agent.router, prefix="/api/agent", tags=["Agent"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])


@app.post("/webhook/telegram")
async def telegram_webhook(request: Request):
    """Handle incoming Telegram updates."""
    try:
        body = await request.json()
        from app.services.telegram_service import handle_webhook_update, send_message
        
        result = await handle_webhook_update(body)
        action = result.get("action")
        
        if action == "respond":
            await send_message(chat_id=result["chat_id"], text=result["message"])
        elif action == "welcome":
            await send_message(chat_id=result["chat_id"], text=result["message"])
        
        return JSONResponse({"status": "ok"})
    
    except Exception as e:
        logger.error(f"Telegram webhook error: {e}")
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)


@app.get("/health", tags=["System"])
async def health_check():
    from app.services.telegram_service import get_webhook_url
    settings = get_settings()
    return {
        "status": "healthy",
        "service": "TaskFlow Agent",
        "version": "0.1.0",
        "environment": settings.environment,
        "webhook_url": get_webhook_url(),
    }


@app.post("/setup-webhook", tags=["System"])
async def setup_webhook_endpoint():
    """Manually trigger Telegram webhook setup."""
    from app.services.telegram_service import setup_webhook, get_webhook_url
    webhook_url = get_webhook_url()
    if not webhook_url:
        return JSONResponse({"status": "error", "message": "WEBHOOK_BASE_URL not configured"}, status_code=400)
    success = await setup_webhook()
    if success:
        return {"status": "ok", "webhook_url": webhook_url}
    return JSONResponse({"status": "error", "message": "Failed to set webhook"}, status_code=500)


@app.get("/", tags=["System"])
async def root():
    return {
        "service": "TaskFlow Agent",
        "version": "0.1.0",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
