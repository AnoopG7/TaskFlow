"""Telegram notification service."""
import logging
import asyncio
from telegram import Bot
from telegram.error import TelegramError
from app.config import get_settings

logger = logging.getLogger(__name__)

_bot: Bot | None = None
_cached_chats: dict[str, str] = {}


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
    """
    Send a message via Telegram.
    
    Args:
        chat_id: Telegram chat ID
        text: Message text
        parse_mode: Parse mode (Markdown or HTML)
    
    Returns:
        True if sent successfully
    """
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


async def send_photo(chat_id: str, photo_url: str, caption: str | None = None) -> bool:
    """Send a photo via Telegram."""
    bot = _get_bot()
    if not bot:
        return False
    
    try:
        await bot.send_photo(
            chat_id=chat_id,
            photo=photo_url,
            caption=caption,
        )
        return True
    except Exception as e:
        logger.error(f"Failed to send photo: {e}")
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


async def get_me() -> dict | None:
    """Get bot information."""
    bot = _get_bot()
    if not bot:
        return None
    
    try:
        me = await bot.get_me()
        return {
            "id": me.id,
            "username": me.username,
            "first_name": me.first_name,
        }
    except Exception as e:
        logger.error(f"Failed to get bot info: {e}")
        return None


async def handle_webhook_update(update: dict) -> dict:
    """
    Handle incoming Telegram webhook updates.
    
    Returns:
        Response dict with action to take
    """
    from app.agent.loop import run_agent
    
    if "message" not in update:
        return {"action": "ignore", "reason": "no_message"}
    
    message = update["message"]
    chat = message.get("chat", {})
    text = message.get("text", "")
    
    chat_id = str(chat.get("id"))
    user_id = chat_id  # Use chat_id as user_id for Telegram users
    
    # Handle commands
    if text.startswith("/"):
        command = text.split()[0].lower()
        
        if command == "/start":
            return {
                "action": "welcome",
                "chat_id": chat_id,
                "message": "Welcome to TaskFlow! I'm your personal chief of staff.",
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

Natural language also works! Just tell me what to do.""",
            }
        
        return {
            "action": "unknown_command",
            "chat_id": chat_id,
            "message": f"Unknown command: {command}",
        }
    
    # Handle natural language
    result = await run_agent(user_id, message=text)
    
    return {
        "action": "respond",
        "chat_id": chat_id,
        "message": result.get("response", "Done!"),
    }