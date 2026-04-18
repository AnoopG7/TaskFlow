from groq import Groq
from app.config import get_settings
import logging
import json

logger = logging.getLogger(__name__)


class GroqService:
    """Wrapper for Groq API (LLM)"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(GroqService, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not hasattr(self, 'client'):
            settings = get_settings()
            self.client = Groq(api_key=settings.groq_api_key)
            logger.info("Groq client initialized")
    
    def analyze_task(self, task_title: str, task_description: str) -> dict:
        """Analyze task and provide AI insights"""
        try:
            prompt = f"""Analyze this task and provide:
1. Estimated time in hours
2. Priority level (low/medium/high)
3. Risk factors if any
4. Suggested subtasks

Task: {task_title}
Description: {task_description}

Provide response as JSON with keys: estimated_hours, priority, risks, subtasks"""
            
            message = self.client.chat.completions.create(
                model="mixtral-8x7b-32768",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=512
            )
            
            response_text = message.choices[0].message.content
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                return json.loads(response_text[json_start:json_end])
            return {"error": "Could not parse response"}
        except Exception as e:
            logger.error(f"Error analyzing task: {e}")
            return {"error": str(e)}


def get_groq_service():
    """Get Groq service singleton"""
    return GroqService()
