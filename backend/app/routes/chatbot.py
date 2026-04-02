from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.chatbot_service import chatbot_service
from app.core.dependencies import get_current_user
from app.database import supabase_request
import logging

router = APIRouter(prefix="/chatbot", tags=["Hava AI Chatbot"])
logger = logging.getLogger(__name__)

class ChatMessage(BaseModel):
    message: str
    user_context: Optional[dict] = {}

class ChatResponse(BaseModel):
    reply: str

@router.post("/message", response_model=ChatResponse)
async def send_message(request: ChatMessage, user = Depends(get_current_user)):
    """
    User sends a message to Hava AI Chatbot.
    Returns the AI-generated response with enriched user health context.
    """
    # 1. Fetch user health profile
    health_profile = {}
    try:
        prof_res = await supabase_request("health_profiles", "GET", query_params={"user_id": f"eq.{user.id}", "limit": "1"}, token=user.token)
        if prof_res:
            health_profile = prof_res[0]
    except Exception as e:
        logger.error(f"Error fetching health profile for Hava context: {e}")
        
    # 2. Fetch latest breath test
    latest_test = {}
    try:
        test_res = await supabase_request("breath_tests", "GET", query_params={"user_id": f"eq.{user.id}", "order": "created_at.desc", "limit": "1"}, token=user.token)
        if test_res:
            latest_test = test_res[0]
    except Exception as e:
        logger.error(f"Error fetching breath test for Hava context: {e}")
        
    # 3. Fetch latest prediction
    latest_pred = {}
    try:
        pred_res = await supabase_request("risk_predictions", "GET", query_params={"user_id": f"eq.{user.id}", "order": "created_at.desc", "limit": "1"}, token=user.token)
        if pred_res:
            latest_pred = pred_res[0]
    except Exception as e:
        logger.error(f"Error fetching latest prediction for Hava context: {e}")

    # 4. Fetch latest environment data
    latest_env = {}
    try:
        env_res = await supabase_request("environment_data", "GET", query_params={"user_id": f"eq.{user.id}", "order": "created_at.desc", "limit": "1"}, token=user.token)
        if env_res:
            latest_env = env_res[0]
    except Exception as e:
        logger.error(f"Error fetching environment data for Hava context: {e}")

    # Combine into a single structured context for the AI reasoning engine
    enriched_context = {
        "User Information": health_profile,
        "Latest Breath Test": latest_test,
        "Latest Risk Prediction": latest_pred,
        "Latest Logged Environment/AQI Data": latest_env,
        "Client Context": request.user_context
    }
    
    reply = await chatbot_service.get_response(request.message, enriched_context)
    return {"reply": reply}
