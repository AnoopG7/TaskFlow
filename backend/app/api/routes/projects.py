"""
Project API Routes — full CRUD with task linking.
All endpoints use X-User-ID header for auth.
"""

from fastapi import APIRouter, HTTPException, Query, Header
from typing import Optional
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


# ─── Schemas ─────────────────────────────────────────────────────


class ProjectCreate(BaseModel):
    """Schema for creating a project."""
    name: str = Field(..., min_length=1, max_length=255, description="Project name")
    description: Optional[str] = Field(None, max_length=2000)
    color: str = Field(default="blue", pattern="^(blue|violet|emerald|amber|rose|cyan)$")


class ProjectUpdate(BaseModel):
    """Schema for updating a project."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    color: Optional[str] = Field(None, pattern="^(blue|violet|emerald|amber|rose|cyan)$")
    status: Optional[str] = Field(None, pattern="^(active|archived|completed)$")


class LinkTasksRequest(BaseModel):
    """Request to link tasks to a project."""
    task_ids: list[str] = Field(..., min_length=1)


# ─── Endpoints ───────────────────────────────────────────────────


@router.post("", status_code=201)
async def create_project(project: ProjectCreate, x_user_id: str = Header(..., alias="X-User-ID")):
    """Create a new project."""
    from app.services.supabase_service import create_project as db_create_project

    try:
        project_data = project.model_dump()
        project_data["user_id"] = x_user_id
        project_data["status"] = "active"

        result = await db_create_project(project_data)
        if not result:
            raise HTTPException(status_code=500, detail="Failed to create project")

        logger.info(f"✅ Project created: {result.get('id')} for user {x_user_id}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create project: {str(e)}")


@router.get("")
async def list_projects(
    x_user_id: str = Header(..., alias="X-User-ID"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List all projects for a user with analytics."""
    from app.services.supabase_service import get_projects as db_get_projects
    from app.services.supabase_service import get_project_analytics

    try:
        projects = await db_get_projects(x_user_id)

        # Add analytics for each project
        for project in projects:
            analytics = await get_project_analytics(project.get("id"), x_user_id)
            project.update(analytics)

        # Apply pagination
        total = len(projects)
        projects = projects[offset: offset + limit]

        return {"projects": projects, "total": total, "limit": limit, "offset": offset}
    except Exception as e:
        logger.error(f"Error listing projects: {e}")
        raise HTTPException(status_code=500, detail="Failed to list projects")


@router.get("/{project_id}")
async def get_project(project_id: str, x_user_id: str = Header(..., alias="X-User-ID")):
    """Get a single project with analytics."""
    from app.services.supabase_service import get_project as db_get_project
    from app.services.supabase_service import get_project_analytics

    try:
        project = await db_get_project(project_id, x_user_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        analytics = await get_project_analytics(project_id, x_user_id)
        project.update(analytics)

        return project
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting project: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve project")


@router.put("/{project_id}")
async def update_project(project_id: str, updates: ProjectUpdate, x_user_id: str = Header(..., alias="X-User-ID")):
    """Update a project."""
    from app.services.supabase_service import update_project as db_update_project

    try:
        update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        result = await db_update_project(project_id, x_user_id, update_data)
        if not result:
            raise HTTPException(status_code=404, detail="Project not found or unauthorized")

        logger.info(f"✅ Project updated: {project_id}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating project: {e}")
        raise HTTPException(status_code=500, detail="Failed to update project")


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: str, x_user_id: str = Header(..., alias="X-User-ID"), cascade: bool = Query(True)):
    """Delete a project. If cascade=true, unlinks tasks instead of deleting them."""
    from app.services.supabase_service import delete_project as db_delete_project

    try:
        success = await db_delete_project(project_id, x_user_id, cascade=cascade)
        if not success:
            raise HTTPException(status_code=404, detail="Project not found or unauthorized")

        logger.info(f"✅ Project deleted: {project_id}")
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting project: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete project")


# ─── Project Tasks ───────────────────────────────────────────────


@router.get("/{project_id}/tasks")
async def get_project_tasks(
    project_id: str,
    x_user_id: str = Header(..., alias="X-User-ID"),
    status: Optional[str] = Query(None, pattern="^(pending|in_progress|completed|cancelled)$"),
    priority: Optional[str] = Query(None, pattern="^(low|medium|high|critical)$"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """Get tasks for a project with filtering."""
    from app.services.supabase_service import get_tasks_by_project

    try:
        tasks = await get_tasks_by_project(project_id, x_user_id, status=status, priority=priority)
        total = len(tasks)
        tasks = tasks[offset: offset + limit]

        return {"tasks": tasks, "total": total, "limit": limit, "offset": offset}
    except Exception as e:
        logger.error(f"Error getting project tasks: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve project tasks")


@router.post("/{project_id}/tasks/link")
async def link_tasks_to_project(project_id: str, request: LinkTasksRequest, x_user_id: str = Header(..., alias="X-User-ID")):
    """Link existing tasks to a project."""
    from app.services.supabase_service import link_tasks_to_project as db_link_tasks

    try:
        result = await db_link_tasks(project_id, request.task_ids, x_user_id)
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to link tasks"))

        logger.info(f"✅ Linked {result.get('linked', 0)} tasks to project {project_id}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error linking tasks: {e}")
        raise HTTPException(status_code=500, detail="Failed to link tasks")


@router.post("/{project_id}/tasks/unlink/{task_id}")
async def unlink_task_from_project(project_id: str, task_id: str, x_user_id: str = Header(..., alias="X-User-ID")):
    """Remove a task from a project (set project_id = null)."""
    from app.services.supabase_service import unlink_task_from_project as db_unlink_task

    success = await db_unlink_task(task_id, x_user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found or unauthorized")

    logger.info(f"✅ Unlinked task {task_id} from project {project_id}")
    return {"status": "unlinked", "task_id": task_id}


@router.get("/{project_id}/analytics")
async def get_project_analytics_endpoint(project_id: str, x_user_id: str = Header(..., alias="X-User-ID")):
    """Get analytics for a project."""
    from app.services.supabase_service import get_project_analytics as db_get_analytics

    try:
        analytics = await db_get_analytics(project_id, x_user_id)
        return analytics
    except Exception as e:
        logger.error(f"Error getting project analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve project analytics")