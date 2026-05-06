"""Task CRUD API routes with state machine validation."""
from fastapi import APIRouter, HTTPException, Query, Header
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class Priority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class TaskStatus(str, Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    priority: Priority = Priority.medium
    due_date: Optional[datetime] = None
    project_id: Optional[str] = None
    estimated_hours: Optional[float] = Field(None, ge=0, le=24)
    tags: list[str] = []
    auto_prioritize: bool = False


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    priority: Optional[Priority] = None
    status: Optional[TaskStatus] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = Field(None, ge=0, le=24)
    actual_hours: Optional[float] = Field(None, ge=0, le=24)
    project_id: Optional[str] = None


# ─── CRUD ───────────────────────────────────────────────────────


@router.post("")
async def create_task(task: TaskCreate, x_user_id: str = Header(..., alias="X-User-ID")):
    """Create a new task with optional AI priority inference."""
    from app.services.supabase_service import create_task as db_create_task

    task_data = task.model_dump(exclude={"auto_prioritize"})
    task_data["user_id"] = x_user_id
    task_data["status"] = "pending"

    # Convert datetime to ISO string for Supabase
    if task_data.get("due_date"):
        task_data["due_date"] = task_data["due_date"].isoformat()

    if task.auto_prioritize:
        from app.services.groq_service import complete
        prompt = f"""Analyze this task and assign priority (low/medium/high/critical):
Title: {task.title}
Description: {task.description or 'No description'}
Respond with only one word:"""
        messages = [{"role": "user", "content": prompt}]
        try:
            response = await complete(messages, temperature=0.3, max_tokens=10)
            priority = response.strip().lower()
            if priority in ["low", "medium", "high", "critical"]:
                task_data["priority"] = priority
        except Exception as e:
            logger.warning(f"Auto-prioritize failed: {e}")

    result = await db_create_task(task_data)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create task")

    logger.info(f"✅ Task created: {result.get('id')} for user {x_user_id}")
    return result


@router.get("")
async def list_tasks(
    x_user_id: str = Header(..., alias="X-User-ID"),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    due_today: bool = False,
):
    """List tasks with optional filters."""
    from app.services.supabase_service import get_tasks as db_get_tasks
    tasks = await db_get_tasks(x_user_id, status=status, priority=priority, due_today=due_today)
    return {"tasks": tasks}


@router.get("/search")
async def search_tasks(
    q: str = Query(..., min_length=1, max_length=200),
    exclude_project_id: Optional[str] = None,
    x_user_id: str = Header(..., alias="X-User-ID"),
):
    """Search tasks by title/description."""
    from app.services.supabase_service import search_tasks as db_search_tasks
    tasks = await db_search_tasks(x_user_id, q, exclude_project_id=exclude_project_id)
    return {"tasks": tasks}


@router.get("/{task_id}")
async def get_task_by_id(task_id: str, x_user_id: str = Header(..., alias="X-User-ID")):
    """Get a single task by ID."""
    from app.services.supabase_service import get_task as db_get_task
    task = await db_get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.get("user_id") != x_user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    return task


@router.put("/{task_id}")
async def update_task_by_id(task_id: str, task: TaskUpdate, x_user_id: str = Header(..., alias="X-User-ID")):
    """Update a task with state machine validation for status transitions."""
    from app.services.supabase_service import update_task as db_update_task
    from app.services.supabase_service import get_task as db_get_task
    from app.services.supabase_service import log_status_transition
    from app.utils.task_state_machine import TaskStatusTransition

    # Get existing task to validate ownership and current status
    existing = await db_get_task(task_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
    if existing.get("user_id") != x_user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    task_data = {k: v for k, v in task.model_dump().items() if v is not None}

    # Validate status transition if status is being changed
    if task.status and existing.get("status") != task.status.value:
        if not TaskStatusTransition.is_valid_transition(existing.get("status"), task.status.value):
            allowed = TaskStatusTransition.get_allowed_transitions(existing.get("status"))
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status transition from {existing.get('status')} to {task.status.value}. Allowed: {', '.join(allowed)}"
            )

        # Auto-set date fields based on transition
        if task.status.value == "completed":
            from datetime import timezone
            task_data["completed_date"] = datetime.now(timezone.utc).isoformat()
        elif task.status.value == "in_progress" and not existing.get("start_date"):
            from datetime import timezone
            task_data["start_date"] = datetime.now(timezone.utc).isoformat()
        elif task.status.value == "pending":
            # Reverting — clear completed_date
            task_data["completed_date"] = None

        # Log the transition
        await log_status_transition(
            task_id=task_id,
            from_status=existing.get("status"),
            to_status=task.status.value,
            user_id=x_user_id,
            reason="User-initiated status change"
        )
        logger.info(f"✅ Task status transition: {task_id} ({existing.get('status')} → {task.status.value})")

    # Convert datetime to ISO string for Supabase
    if task_data.get("due_date"):
        task_data["due_date"] = task_data["due_date"].isoformat()

    result = await db_update_task(task_id, task_data)
    if not result:
        raise HTTPException(status_code=404, detail="Task not found")

    return result


@router.post("/{task_id}/complete")
async def complete_task_by_id(task_id: str, actual_hours: Optional[float] = None, x_user_id: str = Header(..., alias="X-User-ID")):
    """Mark a task as completed."""
    from app.services.supabase_service import complete_task as db_complete_task, get_task as db_get_task

    task = await db_get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.get("user_id") != x_user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    result = await db_complete_task(task_id, actual_hours)
    if not result:
        raise HTTPException(status_code=404, detail="Task not found")
    return result


@router.delete("/{task_id}")
async def delete_task_by_id(task_id: str, x_user_id: str = Header(..., alias="X-User-ID")):
    """Delete a task."""
    from app.services.supabase_service import delete_task as db_delete_task, get_task as db_get_task

    task = await db_get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.get("user_id") != x_user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    success = await db_delete_task(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"status": "deleted"}


# ─── Status Transitions ─────────────────────────────────────────


@router.get("/{task_id}/allowed-transitions")
async def get_allowed_transitions(task_id: str, x_user_id: str = Header(..., alias="X-User-ID")):
    """Get list of valid status transitions for a task."""
    from app.services.supabase_service import get_task as db_get_task
    from app.utils.task_state_machine import TaskStatusTransition

    task = await db_get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.get("user_id") != x_user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    current_status = task.get("status", "pending")
    allowed = TaskStatusTransition.get_allowed_transitions(current_status)

    return {
        "task_id": task_id,
        "current_status": current_status,
        "allowed_transitions": allowed,
        "status_descriptions": {
            status: TaskStatusTransition.get_status_description(status)
            for status in [current_status] + allowed
        }
    }


@router.get("/{task_id}/status-history")
async def get_task_status_history(task_id: str, x_user_id: str = Header(..., alias="X-User-ID"), limit: int = Query(50, ge=1, le=500)):
    """Get status change history for a task."""
    from app.services.supabase_service import get_task as db_get_task
    from app.services.supabase_service import get_task_status_history as db_get_status_history

    task = await db_get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.get("user_id") != x_user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    history = await db_get_status_history(task_id, limit=limit)
    return {
        "task_id": task_id,
        "total_transitions": len(history),
        "history": history
    }


# ─── Batch Operations ────────────────────────────────────────────


class BatchCompleteRequest(BaseModel):
    task_ids: list[str]
    actual_hours: Optional[float] = None


class BatchPriorityRequest(BaseModel):
    task_ids: list[str]
    priority: Priority


@router.post("/batch/complete")
async def batch_complete(request: BatchCompleteRequest, x_user_id: str = Header(..., alias="X-User-ID")):
    """Complete multiple tasks at once."""
    from app.services.supabase_service import batch_complete_tasks

    if not request.task_ids:
        raise HTTPException(status_code=400, detail="task_ids cannot be empty")

    result = await batch_complete_tasks(request.task_ids, x_user_id, request.actual_hours)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Batch operation failed"))
    return result


@router.post("/batch/priority")
async def batch_priority(request: BatchPriorityRequest, x_user_id: str = Header(..., alias="X-User-ID")):
    """Update priority for multiple tasks."""
    from app.services.supabase_service import batch_update_priority

    if not request.task_ids:
        raise HTTPException(status_code=400, detail="task_ids cannot be empty")

    result = await batch_update_priority(request.task_ids, x_user_id, request.priority.value)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Batch operation failed"))
    return result


class BatchParseRequest(BaseModel):
    description: str = Field(..., min_length=1, max_length=5000)
    project_id: Optional[str] = None
    user_instructions: Optional[str] = None


@router.post("/batch/parse-and-create")
async def parse_and_create_tasks(request: BatchParseRequest, x_user_id: str = Header(..., alias="X-User-ID")):
    """Parse natural language into tasks and create them."""
    from app.services.task_parser import parse_and_create_batch

    result = await parse_and_create_batch(
        user_id=x_user_id,
        text=request.description,
        user_instructions=request.user_instructions,
        project_id=request.project_id,
    )
    return result