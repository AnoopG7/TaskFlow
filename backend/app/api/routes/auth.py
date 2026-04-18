from fastapi import APIRouter

router = APIRouter()


@router.post("/signup")
async def signup():
    """Signup endpoint"""
    return {"message": "Not yet implemented"}


@router.post("/login")
async def login():
    """Login endpoint"""
    return {"message": "Not yet implemented"}
