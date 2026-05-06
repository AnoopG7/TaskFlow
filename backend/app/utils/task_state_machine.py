"""
Task Status State Machine - Production-grade status management with validation.
Defines valid task status transitions and validates state changes.
"""

from enum import Enum
import logging

logger = logging.getLogger(__name__)


class TaskStatus(str, Enum):
    """Valid task status values."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TaskStatusTransition:
    """
    Defines valid status transitions for tasks.

    State diagram:
    pending ──→ in_progress ──→ completed
      ↓          ↓                  ↑
      └──→ cancelled ←──────────────┘

    Rules:
    - pending: can transition to in_progress or cancelled
    - in_progress: can transition to completed, cancelled, or back to pending (revert)
    - completed: can revert to pending if needed
    - cancelled: can revert to pending
    """

    VALID_TRANSITIONS = {
        TaskStatus.PENDING: {TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED},
        TaskStatus.IN_PROGRESS: {TaskStatus.COMPLETED, TaskStatus.CANCELLED, TaskStatus.PENDING},
        TaskStatus.COMPLETED: {TaskStatus.PENDING},  # Allow reverting if needed
        TaskStatus.CANCELLED: {TaskStatus.PENDING},  # Allow reverting if needed
    }

    @staticmethod
    def is_valid_transition(from_status: str, to_status: str) -> bool:
        """
        Validate if transition from one status to another is allowed.

        Args:
            from_status: Current task status
            to_status: Target task status

        Returns:
            True if transition is valid, False otherwise
        """
        try:
            from_s = TaskStatus(from_status)
            to_s = TaskStatus(to_status)

            # Same status is not a transition
            if from_s == to_s:
                return False

            allowed = TaskStatusTransition.VALID_TRANSITIONS.get(from_s, set())
            is_valid = to_s in allowed

            if not is_valid:
                logger.warning(f"Invalid transition: {from_status} → {to_status}")

            return is_valid
        except ValueError as e:
            logger.error(f"Invalid status value: {e}")
            return False

    @staticmethod
    def get_allowed_transitions(current_status: str) -> list[str]:
        """
        Get list of valid status transitions from current status.

        Args:
            current_status: Current task status

        Returns:
            List of allowed target statuses
        """
        try:
            current = TaskStatus(current_status)
            allowed_set = TaskStatusTransition.VALID_TRANSITIONS.get(current, set())
            return sorted([s.value for s in allowed_set])
        except ValueError as e:
            logger.error(f"Invalid status value: {e}")
            return []

    @staticmethod
    def get_status_description(status: str) -> str:
        """Get human-readable description of status."""
        descriptions = {
            TaskStatus.PENDING: "Pending - Task is waiting to be started",
            TaskStatus.IN_PROGRESS: "In Progress - Task is currently being worked on",
            TaskStatus.COMPLETED: "Completed - Task has been finished",
            TaskStatus.CANCELLED: "Cancelled - Task was cancelled and won't be completed",
        }
        return descriptions.get(status, f"Unknown status: {status}")

    @staticmethod
    def validate_status(status: str) -> bool:
        """Validate if status value is valid."""
        try:
            TaskStatus(status)
            return True
        except ValueError:
            logger.error(f"Invalid task status: {status}")
            return False


class StatusTransitionError(Exception):
    """Exception raised for invalid status transitions."""
    pass


def transition_task_status(current_status: str, target_status: str, task_title: str = "Task") -> bool:
    """
    Perform task status transition with validation.

    Args:
        current_status: Current task status
        target_status: Target task status
        task_title: Task title for logging

    Returns:
        True if transition is valid

    Raises:
        StatusTransitionError: If transition is invalid
    """
    if not TaskStatusTransition.is_valid_transition(current_status, target_status):
        allowed = TaskStatusTransition.get_allowed_transitions(current_status)
        error_msg = (
            f"Cannot transition '{task_title}' from {current_status} to {target_status}. "
            f"Allowed transitions: {', '.join(allowed)}"
        )
        logger.error(error_msg)
        raise StatusTransitionError(error_msg)

    logger.info(f"Status transition valid: {task_title} ({current_status} → {target_status})")
    return True
