from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.core.dependencies import get_current_user
from app.database import supabase_request
import logging

router = APIRouter(prefix="/breath-test", tags=["breath"])
logger = logging.getLogger(__name__)

class BreathTestRequest(BaseModel):
    lung_capacity: float
    breath_duration: float
    breath_strength: float
    test_accuracy: float
    peak_airflow: float = 0.0
    signal_stability: float = 0.0
    is_valid: bool = True
    background_noise_detected: bool = False
    cough_detected: bool = False
    raw_attempts: List[Dict[str, Any]] = []

@router.post("")
async def submit_breath_test(data: BreathTestRequest, user = Depends(get_current_user)):
    user_id = user.id
    try:
        payload = {
            "user_id": user_id,
            "lung_capacity": data.lung_capacity,
            "breath_duration": data.breath_duration,
            "breath_strength": data.breath_strength,
            "test_accuracy": data.test_accuracy,
            "peak_airflow": data.peak_airflow,
            "signal_stability": data.signal_stability,
            "is_valid": data.is_valid,
            "background_noise_detected": data.background_noise_detected,
            "cough_detected": data.cough_detected,
            "raw_attempts": data.raw_attempts
        }
        res = await supabase_request("breath_tests", "POST", data=payload, token=user.token)
        return {"message": "Breath test saved successfully", "data": res[0] if isinstance(res, list) and res else res}
    except Exception as e:
        logger.error(f"Error saving breath test: {e}")
        raise HTTPException(status_code=500, detail="Failed to save breath test data")

@router.get("/{user_id_param}")
async def get_breath_history(user_id_param: str, user = Depends(get_current_user)):
    user_id = user.id
    if user_id_param != user_id:
        # Prevent accessing other user's data; RLS also prevents this but good to have application level check
        raise HTTPException(status_code=403, detail="Not authorized to view this data")
        
    try:
        res = await supabase_request(
            "breath_tests",
            "GET",
            query_params={"user_id": f"eq.{user_id}", "order": "created_at.desc"},
            token=user.token
        )
        return res
    except Exception as e:
        logger.error(f"Error fetching breath history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch breath test history")
