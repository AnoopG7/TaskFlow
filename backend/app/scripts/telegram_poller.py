"""
Telegram polling script for local development.
Run this separately to poll for messages (alternative to webhook).
"""
import asyncio
import logging
import httpx
import json
from app.config import get_settings
from app.services.telegram_service import handle_webhook_update, send_message

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()


async def simple_polling():
    """Simple polling loop without event loop conflicts"""
    if not settings.telegram_token:
        logger.error("❌ TELEGRAM_TOKEN not set!")
        return
    
    logger.info("🚀 Starting Telegram polling...")
    
    offset = 0
    api_url = f"https://api.telegram.org/bot{settings.telegram_token}"
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            logger.info("✅ Telegram polling started. Send a message to your bot!")
            
            while True:
                try:
                    # Get updates
                    response = await client.post(
                        f"{api_url}/getUpdates",
                        json={"offset": offset, "timeout": 25}
                    )
                    
                    updates = response.json().get("result", [])
                    
                    for update in updates:
                        offset = max(offset, update["update_id"] + 1)
                        
                        # Log the update
                        if "message" in update:
                            chat_id = update["message"]["chat"]["id"]
                            text = update["message"].get("text", "")
                            logger.info(f"📨 Message from {chat_id}: {text}")
                            
                            # Process through agent
                            result = await handle_webhook_update(update)
                            
                            # Send response if needed
                            if result.get("action") == "respond":
                                await send_message(
                                    chat_id=str(chat_id),
                                    text=result.get("message", "Done!"),
                                )
                            elif result.get("action") == "welcome":
                                await send_message(
                                    chat_id=str(chat_id),
                                    text=result.get("message", "Welcome!"),
                                )
                
                except Exception as e:
                    logger.error(f"Error processing update: {e}")
                    await asyncio.sleep(1)
    
    except KeyboardInterrupt:
        logger.info("🛑 Polling stopped")
    except Exception as e:
        logger.error(f"Polling error: {e}")


if __name__ == "__main__":
    asyncio.run(simple_polling())
