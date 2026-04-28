"""
Authorization and security utilities.
Rate limiting and input validation.
"""

import logging
from datetime import datetime, timedelta
from functools import wraps
from fastapi import HTTPException

logger = logging.getLogger(__name__)


class RateLimiter:
    """Simple in-memory rate limiter."""

    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.requests: dict[str, list[datetime]] = {}

    def is_allowed(self, user_id: str) -> bool:
        """Check if user is within rate limit."""
        now = datetime.utcnow()
        minute_ago = now - timedelta(minutes=1)

        if user_id not in self.requests:
            self.requests[user_id] = []

        # Clean old requests
        self.requests[user_id] = [
            req_time for req_time in self.requests[user_id] if req_time > minute_ago
        ]

        if len(self.requests[user_id]) < self.requests_per_minute:
            self.requests[user_id].append(now)
            return True

        return False

    def get_remaining(self, user_id: str) -> int:
        """Get remaining requests for user in current minute."""
        now = datetime.utcnow()
        minute_ago = now - timedelta(minutes=1)

        if user_id not in self.requests:
            return self.requests_per_minute

        self.requests[user_id] = [
            req_time for req_time in self.requests[user_id] if req_time > minute_ago
        ]

        return max(0, self.requests_per_minute - len(self.requests[user_id]))


# Global rate limiter instance
rate_limiter = RateLimiter(requests_per_minute=100)


async def verify_task_ownership(task_id: str, user_id: str) -> bool:
    """Verify that user owns the task."""
    from app.services.supabase_service import get_task

    task = await get_task(task_id)
    if not task:
        return False

    return task.get("user_id") == user_id


async def verify_project_ownership(project_id: str, user_id: str) -> bool:
    """Verify that user owns the project."""
    from app.services.supabase_service import get_project

    project = await get_project(project_id, user_id)
    return project is not None


# Input validation helpers

def sanitize_string(text: str, max_length: int = 5000) -> str:
    """Sanitize user input string."""
    if not isinstance(text, str):
        raise ValueError("Input must be a string")

    return text.strip()[:max_length]


def validate_email(email: str) -> bool:
    """Validate email format."""
    import re

    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(pattern, email))


def validate_priority(priority: str) -> bool:
    """Validate task priority."""
    return priority in ["low", "medium", "high", "critical"]


def validate_status(status: str) -> bool:
    """Validate task status."""
    return status in ["pending", "in_progress", "completed", "cancelled"]
