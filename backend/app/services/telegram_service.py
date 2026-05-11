"""Telegram notification service."""
import logging
import asyncio
from telegram import Bot
from telegram.error import TelegramError
from app.config import get_settings

logger = logging.getLogger(__name__)

_bot: Bot | None = None
_processed_message_ids: set[int] = set()
MAX_PROCESSED_CACHE = 1000


def _is_already_processed(message_id: int) -> bool:
    """Check if message was already processed (deduplication)."""
    if message_id in _processed_message_ids:
        return True
    return False


def _mark_processed(message_id: int):
    """Mark message as processed."""
    _processed_message_ids.add(message_id)
    if len(_processed_message_ids) > MAX_PROCESSED_CACHE:
        while len(_processed_message_ids) > MAX_PROCESSED_CACHE:
            _processed_message_ids.pop()


def _get_bot() -> Bot | None:
    """Get Telegram bot singleton."""
    global _bot
    settings = get_settings()
    
    if not settings.telegram_token:
        logger.warning("Telegram token not configured")
        return None
    
    if _bot is None:
        _bot = Bot(token=settings.telegram_token)
    
    return _bot


async def send_message(chat_id: str, text: str, parse_mode: str = "Markdown") -> bool:
    """Send a message via Telegram."""
    bot = _get_bot()
    if not bot:
        logger.warning("Telegram not configured, skipping message")
        return False
    
    try:
        await bot.send_message(
            chat_id=chat_id,
            text=text,
            parse_mode=parse_mode,
        )
        logger.info(f"📱 Telegram message sent to {chat_id}")
        return True
    
    except TelegramError as e:
        logger.error(f"Telegram error: {e}")
        return False
    except Exception as e:
        logger.error(f"Failed to send Telegram message: {e}")
        return False


async def set_webhook(webhook_url: str) -> bool:
    """Set the Telegram webhook."""
    bot = _get_bot()
    if not bot:
        return False
    
    try:
        await bot.set_webhook(url=webhook_url)
        logger.info(f"✅ Telegram webhook set: {webhook_url}")
        return True
    except Exception as e:
        logger.error(f"Failed to set webhook: {e}")
        return False


def get_webhook_url() -> str:
    """Get the full webhook URL from config."""
    settings = get_settings()
    if not settings.webhook_base_url:
        logger.warning("WEBHOOK_BASE_URL not configured")
        return ""
    return f"{settings.webhook_base_url}/webhook/telegram"


async def setup_webhook() -> bool:
    """Set webhook using the configured base URL."""
    webhook_url = get_webhook_url()
    if not webhook_url:
        return False
    return await set_webhook(webhook_url)


async def handle_webhook_update(update: dict) -> dict:
    """Handle incoming Telegram webhook updates."""
    from app.agent.loop import run_agent
    from app.services.supabase_service import get_supabase_anon
    
    if "message" not in update:
        return {"action": "ignore", "reason": "no_message"}
    
    message = update["message"]
    chat = message.get("chat", {})
    text = message.get("text", "")
    message_id = message.get("message_id")
    
    chat_id = str(chat.get("id"))
    
    # Deduplication: skip if already processed this message_id
    if message_id:
        if message_id in _processed_message_ids:
            logger.info(f"Skipping duplicate message_id: {message_id}")
            return {"action": "ignore", "reason": "duplicate"}
        _mark_processed(message_id)
    
    # Look up the real user by their telegram_chat_id
    user_id: str | None = None
    db = get_supabase_anon()
    
    if not db:
        logger.error("❌ Supabase client not available")
        return {
            "action": "respond",
            "chat_id": chat_id,
            "message": "System is currently unavailable. Please try again later.",
        }
    
    try:
        result = db.table("user_profiles").select("user_id").eq("telegram_chat_id", chat_id).execute()
        
        if result.data and len(result.data) > 0:
            user_id = result.data[0]["user_id"]
            logger.info(f"✅ Telegram {chat_id} linked to user {user_id} (via user_profiles)")
    except Exception as e:
        logger.warning(f"Error querying user_profiles: {e}")
    
    # Fallback: query agent_preferences if not found
    if not user_id:
        try:
            result = db.table("agent_preferences").select("user_id").eq("telegram_chat_id", chat_id).execute()
            
            if result.data and len(result.data) > 0:
                user_id = result.data[0]["user_id"]
                logger.info(f"✅ Telegram {chat_id} linked to user {user_id} (via agent_preferences)")
        except Exception as e:
            logger.warning(f"Error querying agent_preferences: {e}")
    
    if not user_id:
        logger.warning(f"⚠️ Telegram {chat_id} not linked to any user")
        return {
            "action": "respond",
            "chat_id": chat_id,
            "message": "⚠️ Telegram not linked to your TaskFlow account.\n\n"
                       "To link your account:\n"
                       "1. Get your Telegram Chat ID by messaging @userinfobot\n"
                       "2. Go to TaskFlow → Settings → Telegram Chat ID\n"
                       "3. Enter your ID and save",
        }
    
    # Handle commands
    if text.startswith("/"):
        command = text.split()[0].lower()
        
        if command == "/start":
            return {
                "action": "welcome",
                "chat_id": chat_id,
                "message": f"👋 Welcome to TaskFlow! I'm your personal chief of staff.\n\n"
                           "I can help you manage tasks and projects. Try:\n"
                           "• `/today` - See your pending tasks\n"
                           "• `/brief` - Get your morning brief\n"
                           "• `/help` - Show all commands\n\n"
                           "Or just tell me what to do in plain English!",
            }
        
        elif command == "/today":
            result = await run_agent(user_id, message="Show today's tasks", trigger_type="list_tasks")
            return {
                "action": "respond",
                "chat_id": chat_id,
                "message": result.get("response", "No tasks found"),
            }
        
        elif command == "/brief":
            result = await run_agent(user_id, trigger_type="morning_brief")
            return {
                "action": "respond",
                "chat_id": chat_id,
                "message": result.get("response", "No tasks"),
            }
        
        elif command == "/help":
            return {
                "action": "respond",
                "chat_id": chat_id,
                "message": """*TaskFlow Commands*

/today - Show today's tasks
/brief - Get morning brief
/help - Show this help

Natural language also works! Just tell me what to do.

Example: *"Create a task to review PR 456, high priority, due tomorrow"*""",
            }
        
        return {
            "action": "unknown_command",
            "chat_id": chat_id,
            "message": f"Unknown command: {command}\n\nUse /help to see available commands.",
        }
    
    # Handle natural language
    result = await run_agent(user_id, message=text)
    
    return {
        "action": "respond",
        "chat_id": chat_id,
        "message": result.get("response", "Done!"),
    }


async def start_polling():
    """Poll Telegram for updates (for local development)."""
    from app.services.supabase_service import get_supabase_anon
    
    bot = _get_bot()
    if not bot:
        logger.warning("❌ Telegram bot not configured, skipping polling")
        return
    
    # Delete any existing webhook so polling works
    try:
        await bot.delete_webhook()
        logger.info("✅ Webhook deleted, using polling mode")
    except Exception as e:
        logger.warning(f"Failed to delete webhook: {e}")
    
    last_update_id = None
    logger.info("🔄 Starting Telegram polling... (polling for updates every 2s)")
    
    while True:
        try:
            updates = await bot.get_updates(
                offset=last_update_id,
                timeout=30,
                allowed_updates=["message"],
            )
            
            for update in updates:
                last_update_id = update.update_id + 1
                
                # Convert Update object to dict format expected by handle_webhook_update
                update_dict = {
                    "message": {
                        "chat": {"id": str(update.message.chat.id)},
                        "text": update.message.text or "",
                        "message_id": update.message.message_id,
                    }
                }
                
                result = await handle_webhook_update(update_dict)
                
                if result.get("action") == "respond":
                    await send_message(
                        chat_id=result["chat_id"],
                        text=result["message"],
                    )
                elif result.get("action") == "welcome":
                    await send_message(
                        chat_id=result["chat_id"],
                        text=result["message"],
                    )
        
        except Exception as e:
            logger.error(f"Polling error: {e}")
        
        await asyncio.sleep(2)
