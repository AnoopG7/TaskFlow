"""Task CRUD API routes."""
from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime

router = APIRouter()


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[datetime] = None
    project_id: Optional[str] = None
    estimated_hours: Optional[float] = None
    tags: list[str] = []
    auto_prioritize: bool = False


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    project_id: Optional[str] = None


@router.post("")
async def create_task(task: TaskCreate, user_id: str):
    """Create a new task with optional AI priority inference."""
    from app.services.supabase_service import create_task as db_create_task
    
    task_data = task.model_dump(exclude={"auto_prioritize"})
    task_data["user_id"] = user_id
    
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
        except Exception:
            pass
    
    result = await db_create_task(task_data)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create task")
    
    return result


@router.get("")
async def list_tasks(
    user_id: str,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    due_today: bool = False,
):
    """List tasks with optional filters."""
    from app.services.supabase_service import get_tasks as db_get_tasks
    tasks = await db_get_tasks(user_id, status=status, priority=priority, due_today=due_today)
    return {"tasks": tasks}


@router.get("/{task_id}")
async def get_task_by_id(task_id: str):
    """Get a single task by ID."""
    from app.services.supabase_service import get_task as db_get_task
    task = await db_get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}")
async def update_task_by_id(task_id: str, task: TaskUpdate):
    """Update a task."""
    from app.services.supabase_service import update_task as db_update_task
    task_data = {k: v for k, v in task.model_dump().items() if v is not None}
    # Convert datetime to ISO string for Supabase
    if task_data.get("due_date"):
        task_data["due_date"] = task_data["due_date"].isoformat()
    result = await db_update_task(task_id, task_data)
    if not result:
        raise HTTPException(status_code=404, detail="Task not found")
    return result


@router.post("/{task_id}/complete")
async def complete_task_by_id(task_id: str, actual_hours: Optional[float] = None):
    """Mark a task as completed."""
    from app.services.supabase_service import complete_task as db_complete_task
    result = await db_complete_task(task_id, actual_hours)
    if not result:
        raise HTTPException(status_code=404, detail="Task not found")
    return result


@router.delete("/{task_id}")
async def delete_task_by_id(task_id: str):
    """Delete a task."""
    from app.services.supabase_service import delete_task as db_delete_task
    success = await db_delete_task(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"status": "deleted", "task_id": task_id}


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    color: str = "blue"


@router.post("/projects")
async def create_project(project: ProjectCreate, user_id: str):
    """Create a new project."""
    from app.services.supabase_service import create_project as db_create_project
    project_data = project.model_dump()
    project_data["user_id"] = user_id
    result = await db_create_project(project_data)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create project")
    return result


@router.get("/projects")
async def list_projects(user_id: str):
    """List all projects for a user."""
    from app.services.supabase_service import get_projects as db_get_projects
    projects = await db_get_projects(user_id)
    return {"projects": projects}