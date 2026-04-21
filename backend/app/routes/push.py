from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Dict, Any, Optional
from app.database import supabase_admin_request
from app.routes.auth import get_current_user
import logging

router = APIRouter(prefix="/push", tags=["Push Notifications"])
logger = logging.getLogger(__name__)

@router.post("/register")
async def register_push_token(
    token: str = Body(..., embed=True),
    platform: Optional[str] = Body("web", embed=True),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Registers or updates an FCM push token for the current user.
    """
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in session")

    try:
        # Upsert the token
        # We use a unique constraint on (user_id, token) but here we can just update updated_at if it exists
        data = {
            "user_id": user_id,
            "token": token,
            "platform": platform,
            "updated_at": "now()" # postgres shorthand
        }
        
        # Check if token exists for this user to avoid unnecessary inserts
        response = await supabase_admin_request(
            "push_tokens", 
            "POST", 
            data, 
            params={"on_conflict": "user_id,token"} 
        )
        
        if not response:
             raise HTTPException(status_code=500, detail="Failed to register push token")

        logger.info(f"Registered push token for user {user_id}")
        return {"success": True, "message": "Push token registered successfully"}

    except Exception as e:
        logger.error(f"Error registering push token: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/unregister")
async def unregister_push_token(
    token: str = Body(..., embed=True),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Removes a push token (on logout).
    """
    user_id = current_user.get("id")
    try:
        await supabase_admin_request(
            "push_tokens",
            "DELETE",
            params={"user_id": f"eq.{user_id}", "token": f"eq.{token}"}
        )
        return {"success": True}
    except Exception as e:
        logger.error(f"Error unregistering push token: {e}")
        return {"success": False, "error": str(e)}
