"""Parse LLM response into actionable items."""
import json
import logging
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger(__name__)


class ParsedAction(BaseModel):
    """Parsed action from LLM response."""
    intent: str = "chat"
    task_data: Optional[dict] = None
    complete_task_id: Optional[str] = None
    response_text: str = ""
    confidence: float = 0.5


def parse_llm_response(response: str, profile: dict) -> ParsedAction:
    """
    Parse LLM response into structured actions.
    
    Uses JSON schema in prompt for consistent parsing.
    Falls back to chat intent if parsing fails.
    """
    if not response or not response.strip():
        return ParsedAction(
            intent="chat",
            response_text="I'm here to help with your tasks. What would you like to do?",
        )

    try:
        # Try to extract JSON from response
        # Look for JSON block (```json ... ``` or just {...})
        json_start = response.find("{")
        json_end = response.rfind("}")
        
        if json_start != -1 and json_end > json_start:
            json_str = response[json_start : json_end + 1]
            data = json.loads(json_str)
            
            return ParsedAction(
                intent=data.get("intent", "chat"),
                task_data=data.get("task_data"),
                complete_task_id=data.get("complete_task_id"),
                response_text=data.get("response_text", response),
                confidence=data.get("confidence", 0.7),
            )
    except json.JSONDecodeError as e:
        logger.debug(f"JSON parse failed: {e}")
    
    # Fallback: treat as chat response
    # Try to detect simple commands
    response_lower = response.lower().strip()
    
    if response_lower.startswith("/done") or "mark" in response_lower and "complete" in response_lower:
        return ParsedAction(
            intent="complete_task",
            response_text=response,
            confidence=0.8,
        )
    elif response_lower.startswith("/add") or "create" in response_lower and "task" in response_lower:
        return ParsedAction(
            intent="create_task",
            response_text=response,
            confidence=0.8,
        )
    elif "morning brief" in response_lower or "today's plan" in response_lower:
        return ParsedAction(
            intent="send_brief",
            response_text=response,
            confidence=0.9,
        )
    
    return ParsedAction(
        intent="chat",
        response_text=response,
        confidence=0.5,
    )


async def execute_actions(actions: ParsedAction, user_id: str) -> dict:
    """Execute the parsed actions."""
    from app.services.supabase_service import (
        create_task,
        complete_task,
        get_tasks,
    )
    from app.agent.memory import update_memory_on_complete
    
    results = {"executed": [], "errors": []}
    
    # Create task if requested
    if actions.intent == "create_task" and actions.task_data:
        task_data = actions.task_data.copy()
        task_data["user_id"] = user_id
        task_data["status"] = "pending"
        
        try:
            result = await create_task(task_data)
            results["executed"].append({"action": "create_task", "task_id": result["id"]})
        except Exception as e:
            results["errors"].append({"action": "create_task", "error": str(e)})
    
    # Complete task if requested
    if actions.intent == "complete_task" and actions.complete_task_id:
        try:
            result = await complete_task(actions.complete_task_id)
            await update_memory_on_complete(user_id, actions.complete_task_id)
            results["executed"].append({"action": "complete_task", "task_id": actions.complete_task_id})
        except Exception as e:
            results["errors"].append({"action": "complete_task", "error": str(e)})
    
    return results