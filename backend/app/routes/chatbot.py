from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.chatbot_service import chatbot_service
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/chatbot", tags=["Hava AI Chatbot"])

class ChatMessage(BaseModel):
    message: str
    user_context: Optional[dict] = {}

class ChatResponse(BaseModel):
    reply: str

@router.post("/message", response_model=ChatResponse)
async def send_message(request: ChatMessage, user = Depends(get_current_user)):
    """
    User sends a message to Hava AI Chatbot.
    Returns the AI-generated response.
    """
    from app.core.database import get_db
    import logging
    
    supabase = get_db()
    
    # 1. Fetch user health profile
    health_profile = {}
    try:
        prof_res = supabase.table("health_profiles").select("*").eq("user_id", user.id).execute()
        if prof_res.data:
            health_profile = prof_res.data[0]
    except Exception as e:
        logging.error(f"Error fetching health profile for Hava context: {e}")
        
    # 2. Fetch latest breath test
    latest_test = {}
    try:
        test_res = supabase.table("breath_tests").select("*").eq("user_id", user.id).order("created_at", desc=True).limit(1).execute()
        if test_res.data:
            latest_test = test_res.data[0]
    except Exception as e:
        logging.error(f"Error fetching breath test for Hava context: {e}")
        
    # 3. Fetch latest prediction
    latest_pred = {}
    try:
        pred_res = supabase.table("risk_predictions").select("*").eq("user_id", user.id).order("created_at", desc=True).limit(1).execute()
        if pred_res.data:
            latest_pred = pred_res.data[0]
    except Exception as e:
        logging.error(f"Error fetching latest prediction for Hava context: {e}")

    # 4. Fetch latest environment data
    latest_env = {}
    try:
        env_res = supabase.table("environment_data").select("*").eq("user_id", user.id).order("created_at", desc=True).limit(1).execute()
        if env_res.data:
            latest_env = env_res.data[0]
    except Exception as e:
        logging.error(f"Error fetching environment data for Hava context: {e}")

    # Combine into a single structured context
    enriched_context = {
        "User Information": health_profile,
        "Latest Breath Test (last assessment)": latest_test,
        "Latest Risk Prediction": latest_pred,
        "Latest Logged Environment/AQI Data": latest_env,
        "Client Context": request.user_context
    }
    
    reply = await chatbot_service.get_response(request.message, enriched_context)
    return {"reply": reply}
