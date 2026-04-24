"""Groq LLM service for TaskFlow - using direct HTTP."""
import logging
import httpx
from app.config import get_settings

logger = logging.getLogger(__name__)

_base_url = "https://api.groq.com/openai/v1"


async def complete(
    messages: list[dict],
    temperature: float = 0.7,
    max_tokens: int = 1024,
) -> str:
    """Send a chat completion request to Groq."""
    settings = get_settings()
    
    if not settings.groq_api_key:
        raise ValueError("GROQ_API_KEY not configured")
    
    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "model": settings.groq_model or "llama-3.3-70b-versatile",
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{_base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"Groq API error: {e}")
            raise