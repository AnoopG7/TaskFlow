"""FastAPI application entry point."""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

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
    from app.services.supabase_service import init_supabase
    from app.services.scheduler import start_scheduler, stop_scheduler

    logger.info("🚀 TaskFlow starting up...")

    # Initialize Supabase
    try:
        init_supabase()
        logger.info("✅ Supabase connected")
    except Exception as e:
        logger.warning(f"Supabase connection: {e}")

    # Start scheduler (only in production)
    settings = get_settings()
    if settings.environment == "production":
        try:
            await start_scheduler()
            logger.info("✅ Scheduler started")
        except Exception as e:
            logger.warning(f"Scheduler failed to start: {e}")

    logger.info("✅ TaskFlow ready")
    yield

    # Shutdown
    try:
        if settings.environment == "production":
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
        from app.services.telegram_service import handle_webhook_update
        
        result = await handle_webhook_update(body)
        
        action = result.get("action")
        
        if action == "respond":
            from app.services.telegram_service import send_message
            await send_message(
                chat_id=result["chat_id"],
                text=result["message"],
            )
        
        return JSONResponse({"status": "ok"})
    
    except Exception as e:
        logger.error(f"Telegram webhook error: {e}")
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)


@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "healthy", "service": "TaskFlow Agent", "version": "0.1.0"}


@app.get("/", tags=["System"])
async def root():
    return {
        "service": "TaskFlow Agent",
        "version": "0.1.0",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)