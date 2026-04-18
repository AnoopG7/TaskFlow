class DailyPlannerException(Exception):
    """Base exception for Daily Planner Agent"""
    pass


class AuthenticationError(DailyPlannerException):
    """Raised when authentication fails"""
    pass


class TaskProcessingError(DailyPlannerException):
    """Raised when task processing fails"""
    pass
