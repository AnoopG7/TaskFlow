"""Project API routes."""
from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel, Field

router = APIRouter()


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    color: str = "blue"


@router.post("")
async def create_project(project: ProjectCreate, user_id: str):
    """Create a new project."""
    from app.services.supabase_service import create_project as db_create_project
    project_data = project.model_dump()
    project_data["user_id"] = user_id
    result = await db_create_project(project_data)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create project")
    return result


@router.get("")
async def list_projects(user_id: str):
    """List all projects for a user."""
    from app.services.supabase_service import get_projects as db_get_projects
    projects = await db_get_projects(user_id)
    return {"projects": projects}