from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.database import supabase_request
from app.core.rate_limit import limiter
import logging

router = APIRouter(prefix="/prediction", tags=["prediction"])
logger = logging.getLogger(__name__)

from typing import List, Optional

class PredictionRequest(BaseModel):
    final_risk_score: float = 0.0
    risk_category: str
    ai_explanation: str
    top_risk_factors: List[str]

@router.post("/store")
@limiter.limit("10/minute")
async def store_prediction(request: Request, data: PredictionRequest, user = Depends(get_current_user)):
    user_id = user.id
    
    try:
        payload = {
            "user_id": user_id,
            "final_risk_score": data.final_risk_score,
            "predicted_condition": data.risk_category,
            "risk_category": data.risk_category,
            "ai_explanation": data.ai_explanation,
            "top_risk_factors": data.top_risk_factors
        }
        res = await supabase_request("risk_predictions", "POST", data=payload, token=user.token)
        # SUPABASE REST API returns the created object when Prefer=return=representation
        return {"message": "Prediction saved successfully", "data": res[0] if isinstance(res, list) and res else res}
    except Exception as e:
        logger.error(f"Error storing prediction: {e}")
        raise HTTPException(status_code=500, detail="Failed to store risk prediction")

@router.get("/{user_id_param}")
@limiter.limit("10/minute")
async def get_prediction_history(request: Request, user_id_param: str, user = Depends(get_current_user)):
    user_id = user.id
    if user_id_param != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    try:
        res = await supabase_request(
            "risk_predictions", 
            "GET", 
            query_params={"user_id": f"eq.{user_id}", "order": "created_at.desc"},
            token=user.token
        )
        return res
    except Exception as e:
        logger.error(f"Error fetching predictions for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch prediction history")
