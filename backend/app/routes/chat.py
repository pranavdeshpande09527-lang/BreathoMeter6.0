from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from app.database import supabase_request
from app.core.dependencies import get_current_user
from app.core.rate_limit import limiter
import logging

router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)
from app.core.security import sanitize_free_text

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    response: str = Field(..., min_length=1, max_length=8000)
    model_config = ConfigDict(extra="forbid")

@router.post("")
@limiter.limit("20/minute")
async def store_chat(request: Request, data: ChatRequest, user = Depends(get_current_user)):
    try:
        res = await supabase_request("chat_history", "POST", data={
            "user_id": user.id,
            "message": sanitize_free_text(data.message, max_length=2000, field_name="message"),
            "response": sanitize_free_text(data.response, max_length=8000, field_name="response")
        }, token=user.token)
        return {"message": "Chat stored successfully", "data": res}
    except Exception as e:
        logger.error(f"Error storing chat: {e}")
        raise HTTPException(status_code=500, detail="Failed to store chat history")
