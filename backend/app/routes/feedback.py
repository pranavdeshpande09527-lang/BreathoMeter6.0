"""
Prediction Feedback Router
===========================
Collects post-prediction user feedback and doctor-click telemetry.
Stored in prediction_feedback table for future model evaluation.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
import logging

from app.core.dependencies import get_current_user
from app.database import supabase_request

router = APIRouter(prefix="/feedback", tags=["Feedback"])
logger = logging.getLogger(__name__)


class FeedbackRequest(BaseModel):
    prediction_id: str
    confirmed_disease: Optional[str] = None
    was_prediction_helpful: Optional[bool] = None
    doctor_clicked: Optional[bool] = False
    doctor_name: Optional[str] = None


@router.post("/submit")
async def submit_feedback(data: FeedbackRequest, user=Depends(get_current_user)):
    """
    Submit post-prediction feedback.
    - confirmed_disease: what the user actually had (if known)
    - was_prediction_helpful: user rating
    - doctor_clicked / doctor_name: telemetry for engagement tracking
    """
    user_id = user.id
    try:
        payload = {
            "prediction_id": data.prediction_id,
            "user_id": user_id,
            "confirmed_disease": data.confirmed_disease,
            "was_prediction_helpful": data.was_prediction_helpful,
            "doctor_clicked": data.doctor_clicked or False,
            "doctor_name": data.doctor_name,
        }
        res = await supabase_request("prediction_feedback", "POST", data=payload, token=user.token)

        logger.info(
            f"[FeedbackSubmit] user={user_id} prediction={data.prediction_id} "
            f"helpful={data.was_prediction_helpful} confirmed='{data.confirmed_disease}'"
        )

        return {"success": True, "message": "Thank you for your feedback!", "id": res[0]["id"] if isinstance(res, list) and res else None}
    except Exception as e:
        logger.error(f"Error saving feedback: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/doctor-click")
async def log_doctor_click(
    prediction_id: str,
    doctor_name: str,
    user=Depends(get_current_user)
):
    """
    Log a doctor-click event (lightweight telemetry).
    Upserts into the feedback row for this prediction if it exists,
    otherwise creates a minimal telemetry record.
    """
    user_id = user.id
    try:
        payload = {
            "prediction_id": prediction_id,
            "user_id": user_id,
            "doctor_clicked": True,
            "doctor_name": doctor_name,
        }
        await supabase_request("prediction_feedback", "POST", data=payload, token=user.token)

        logger.info(
            f"[DoctorClick] user={user_id} prediction={prediction_id} doctor='{doctor_name}'"
        )
        return {"success": True}
    except Exception as e:
        logger.error(f"Error logging doctor click: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{prediction_id}")
async def get_feedback(prediction_id: str, user=Depends(get_current_user)):
    """Get feedback previously submitted for a prediction."""
    try:
        res = await supabase_request(
            "prediction_feedback",
            "GET",
            query_params={"prediction_id": f"eq.{prediction_id}", "user_id": f"eq.{user.id}"},
            token=user.token
        )
        return res[0] if isinstance(res, list) and res else {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
