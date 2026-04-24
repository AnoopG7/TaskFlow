"""Risk detection - Identify tasks at risk of missing deadlines."""
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

logger = logging.getLogger(__name__)


# Risk thresholds (in hours)
CRITICAL_WINDOW = 24  # Critical if due within 24h
HIGH_WINDOW = 48  # High risk if due within 48h
MEDIUM_WINDOW = 72  # Medium risk if due within 72h


def calculate_risk_score(
    task: dict,
    current_tasks_count: int = 0,
    user_available_hours: float = 8.0,
) -> dict:
    """
    Calculate risk score for a task.
    
    Args:
        task: Task dict with due_date, status, priority, estimated_hours
        current_tasks_count: Number of pending tasks
        user_available_hours: Available working hours today
    
    Returns:
        Risk dict with level, score, factors
    """
    risk = {
        "task_id": task.get("id"),
        "level": "low",
        "score": 0.0,
        "factors": [],
        "recommendation": None,
    }
    
    due_date = task.get("due_date")
    if not due_date:
        risk["level"] = "none"
        return risk
    
    # Calculate time until due
    now = datetime.now(timezone.utc)
    if isinstance(due_date, str):
        due_date = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
    
    hours_until_due = (due_date - now).total_seconds() / 3600
    
    # Factor 1: Time pressure
    if hours_until_due <= 0:
        risk["score"] += 50
        risk["factors"].append("already overdue")
    elif hours_until_due <= CRITICAL_WINDOW:
        risk["score"] += 40 + (CRITICAL_WINDOW - hours_until_due) / CRITICAL_WINDOW * 10
        risk["factors"].append(f"due in {int(hours_until_due)}h (critical)")
    elif hours_until_due <= HIGH_WINDOW:
        risk["score"] += 20 + (HIGH_WINDOW - hours_until_due) / HIGH_WINDOW * 20
        risk["factors"].append(f"due in {int(hours_until_due)}h")
    elif hours_until_due <= MEDIUM_WINDOW:
        risk["score"] += 10
        risk["factors"].append(f"due in {int(hours_until_due)}h")
    
    # Factor 2: Estimated time vs available
    estimated = task.get("estimated_hours") or 1
    if user_available_hours > 0:
        load_ratio = estimated / user_available_hours
        if load_ratio > 1.0:
            risk["score"] += 20 * load_ratio
            risk["factors"].append(f"requires {estimated}h, only {user_available_hours}h available")
    
    # Factor 3: Task priority
    priority = task.get("priority", "medium")
    if priority == "critical":
        risk["score"] += 15
        risk["factors"].append("critical priority")
    elif priority == "high":
        risk["score"] += 10
    
    # Factor 4: Current workload
    if current_tasks_count > 5:
        risk["score"] += current_tasks_count * 2
        risk["factors"].append(f"high workload ({current_tasks_count} pending)")
    
    # Factor 5: Already started vs not started
    if task.get("status") == "pending" and hours_until_due < 48:
        risk["score"] += 10
        risk["factors"].append("not started, deadline near")
    
    # Normalize score
    risk["score"] = min(risk["score"], 100)
    
    # Determine level
    if risk["score"] >= 40:
        risk["level"] = "critical"
    elif risk["score"] >= 25:
        risk["level"] = "high"
    elif risk["score"] >= 10:
        risk["level"] = "medium"
    else:
        risk["level"] = "low"
    
    # Generate recommendation
    if risk["level"] == "critical":
        risk["recommendation"] = "Complete immediately or delegate"
    elif risk["level"] == "high":
        risk["recommendation"] = "Schedule for today"
    elif risk["level"] == "medium":
        risk["recommendation"] = "Schedule for tomorrow"
    
    return risk


async def get_at_risk_tasks(user_id: str, tasks: list[dict]) -> list[dict]:
    """
    Get tasks at risk for a user.
    
    Args:
        user_id: User ID
        tasks: List of user's tasks
    
    Returns:
        List of at-risk tasks with risk scores
    """
    at_risk = []
    
    for task in tasks:
        if task.get("status") == "completed":
            continue
        
        risk = calculate_risk_score(task, current_tasks_count=len(tasks))
        
        if risk["level"] in ["critical", "high", "medium"]:
            risk["task_title"] = task.get("title")
            risk["task_due_date"] = task.get("due_date")
            at_risk.append(risk)
    
    # Sort by score descending
    at_risk.sort(key=lambda x: x["score"], reverse=True)
    
    return at_risk


async def check_overload(
    tasks: list[dict],
    expected_hours_today: float = 8.0,
    meetings_hours: float = 0.0,
) -> dict:
    """
    Check if user is overloaded today.
    
    Args:
        tasks: List of pending tasks
        expected_hours_today: Expected working hours today
        meetings_hours: Hours already in meetings
    
    Returns:
        Overload assessment
    """
    available = expected_hours_today - meetings_hours
    
    total_estimated = sum(
        t.get("estimated_hours", 1) or 1
        for t in tasks
        if t.get("due_date")
    )
    
    # Get today's tasks
    today = datetime.now(timezone.utc).date().iso_string()
    today_tasks = [
        t for t in tasks
        if t.get("due_date") and t.get("due_date", "").startswith(today)
    ]
    today_estimated = sum(t.get("estimated_hours", 1) or 1 for t in today_tasks)
    
    assessment = {
        "is_overloaded": today_estimated > available,
        "available_hours": available,
        "estimated_hours_today": today_estimated,
        "total_pending_hours": total_estimated,
        "over_by_hours": max(0, today_estimated - available),
        "recommendation": None,
    }
    
    if assessment["is_overloaded"]:
        assessment["recommendation"] = f"Push {int(assessment['over_by_hours'])}h of work to tomorrow"
    
    return assessment