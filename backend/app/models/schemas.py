from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class TaskRequest(BaseModel):
    """Request schema for creating a task"""
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    priority: str = Field(default="medium")
    deadline: Optional[datetime] = None
    category: Optional[str] = None


class TaskResponse(BaseModel):
    """Response schema for task"""
    id: str
    title: str
    description: Optional[str]
    priority: str
    status: str
    estimated_hours: Optional[float]
    deadline: Optional[datetime]
    created_at: datetime


class UserProfile(BaseModel):
    """User profile schema"""
    user_id: str
    name: str
    timezone: str
    work_hours_start: Optional[str] = None
    work_hours_end: Optional[str] = None
