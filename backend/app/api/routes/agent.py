"""Chat and Agent API routes."""
from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel

router = APIRouter()


class ChatRequest(BaseModel):
    message: Optional[str] = None
    intent: Optional[str] = None
    user_id: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    session_id: Optional[str]
    actions: dict


class TriggerRequest(BaseModel):
    user_id: str


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Main agent endpoint - single LLM call per request."""
    from app.agent.loop import run_agent
    
    result = await run_agent(
        user_id=req.user_id,
        message=req.message,
        session_id=req.session_id,
    )
    
    return ChatResponse(
        response=result.get("response", ""),
        session_id=result.get("session_id"),
        actions=result.get("actions", {}),
    )


@router.get("/sessions/{user_id}")
async def list_sessions(user_id: str, limit: int = 10):
    """List recent sessions for a user."""
    return {"sessions": []}


@router.get("/sessions/{user_id}/{session_id}/history")
async def session_history(user_id: str, session_id: str):
    """Get full message history for a session."""
    return {"session_id": session_id, "messages": []}


@router.post("/sessions/{session_id}/close")
async def end_session(session_id: str):
    """Close a session."""
    from app.agent.memory import close_session
    await close_session(session_id)
    return {"status": "closed", "session_id": session_id}


@router.post("/trigger/{trigger_type}")
async def trigger_agent(req: TriggerRequest, trigger_type: str):
    """Trigger specific agent actions."""
    from app.agent.loop import run_agent, run_morning_brief, run_evening_debrief
    
    if trigger_type == "morning_brief":
        result = await run_morning_brief(req.user_id)
    elif trigger_type == "evening_debrief":
        result = await run_evening_debrief(req.user_id)
    elif trigger_type == "risk_scan":
        result = await run_agent(req.user_id, message="Show me tasks at risk", trigger_type="risk_scan")
    else:
        raise HTTPException(status_code=400, detail=f"Unknown trigger_type: {trigger_type}")
    
    return result


@router.get("/memory")
async def get_agent_memory_endpoint(user_id: str):
    """Get agent memory for a user."""
    from app.services.supabase_service import get_agent_memory
    
    memory = await get_agent_memory(user_id)
    if not memory:
        return {"memory": None, "estimation_bias": 1.0}
    
    return {
        "memory": memory.get("patterns", {}),
        "estimation_bias": memory.get("estimation_bias", 1.0),
        "frequently_missed": memory.get("frequently_missed_categories", []),
    }