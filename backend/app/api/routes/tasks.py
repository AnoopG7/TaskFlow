from fastapi import APIRouter

router = APIRouter()


@router.post("")
async def create_task():
    """Create new task"""
    return {"message": "Not yet implemented"}


@router.get("")
async def list_tasks():
    """Get user tasks"""
    return {"message": "Not yet implemented"}


@router.get("/{task_id}")
async def get_task():
    """Get specific task"""
    return {"message": "Not yet implemented"}


@router.put("/{task_id}")
async def update_task():
    """Update task"""
    return {"message": "Not yet implemented"}


@router.post("/{task_id}/complete")
async def complete_task():
    """Mark task as complete"""
    return {"message": "Not yet implemented"}
