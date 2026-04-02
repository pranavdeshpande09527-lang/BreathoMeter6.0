from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from app.database import supabase_request
from app.core.dependencies import get_current_user
from app.core.rate_limit import limiter
import logging

router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)

class ChatRequest(BaseModel):
    message: str
    response: str

@router.post("")
@limiter.limit("20/minute")
async def store_chat(request: Request, data: ChatRequest, user = Depends(get_current_user)):
    try:
        res = await supabase_request("chat_history", "POST", data={
            "user_id": user.id,
            "message": data.message,
            "response": data.response
        }, token=user.token)
        return {"message": "Chat stored successfully", "data": res}
    except Exception as e:
        logger.error(f"Error storing chat: {e}")
        raise HTTPException(status_code=500, detail="Failed to store chat history")
