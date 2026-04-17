from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from app.core.dependencies import get_current_user
from app.database import supabase_request
from app.core.rate_limit import limiter
from app.core.security import sanitize_free_text, sanitize_string_list
import logging

router = APIRouter(prefix="/prediction", tags=["prediction"])
logger = logging.getLogger(__name__)

from typing import List, Optional

class PredictionRequest(BaseModel):
    final_risk_score: float = 0.0
    risk_category: str = Field(..., min_length=1, max_length=120)
    ai_explanation: str = Field(..., min_length=1, max_length=8000)
    top_risk_factors: List[str] = Field(default_factory=list, max_length=20)
    disease_risks: Optional[List[dict]] = None
    ml_score: Optional[float] = None
    ai_score: Optional[float] = None
    agreement_score: Optional[float] = None
    confidence_score: Optional[float] = None
    confidence_tier: Optional[str] = None          # 'high' | 'moderate' | 'low'
    primary_prediction: Optional[str] = None       # top disease or null
    recommended_specialty: Optional[str] = None    # mapped specialist role
    warnings: Optional[List[str]] = None
    similar_cases_distribution: Optional[dict] = None
    model_version: Optional[str] = None
    model_source: Optional[str] = None
    fallback_used: Optional[bool] = None
    total_candidates_generated: Optional[int] = None
    actual_predictions_count: Optional[int] = None
    fallback_reason: Optional[str] = None
    calibrated_confidence: Optional[float] = None
    confidence_calibrated: Optional[bool] = None
    urgent_attention: Optional[bool] = None
    primary_predictions: Optional[List[dict]] = None
    suggested_alternatives: Optional[List[dict]] = None
    prediction_validity: Optional[str] = None     # 'low' | 'moderate' | 'high'
    confidence_band: Optional[str] = None         # 'low' | 'medium' | 'high'
    input_quality_score: Optional[float] = None   # 0-1
    missing_inputs: Optional[List[str]] = None
    insufficient_data: Optional[bool] = None
    recommended_doctors: Optional[List[dict]] = None
    priority_recommendation: Optional[bool] = None
    model_config = ConfigDict(extra="forbid")

@router.post("/store")
@limiter.limit("10/minute")
async def store_prediction(request: Request, data: PredictionRequest, user = Depends(get_current_user)):
    user_id = user.id
    
    try:
        payload = {
            "user_id": user_id,
            "final_risk_score": data.final_risk_score,
            "predicted_condition": sanitize_free_text(data.risk_category, max_length=120, field_name="risk_category"),
            "risk_category": sanitize_free_text(data.risk_category, max_length=120, field_name="risk_category"),
            "ai_explanation": sanitize_free_text(data.ai_explanation, max_length=8000, field_name="ai_explanation"),
            "top_risk_factors": sanitize_string_list(data.top_risk_factors, max_items=20, max_length=120, field_name="top_risk_factor"),
            "disease_risks": data.disease_risks
        }
        if data.ml_score is not None: payload["ml_score"] = data.ml_score
        if data.ai_score is not None: payload["ai_score"] = data.ai_score
        if data.agreement_score is not None: payload["agreement_score"] = data.agreement_score
        if data.confidence_score is not None: payload["confidence_score"] = data.confidence_score
        if data.confidence_tier is not None: payload["confidence_tier"] = data.confidence_tier
        if data.primary_prediction is not None: payload["primary_prediction"] = data.primary_prediction
        if data.recommended_specialty is not None: payload["recommended_specialty"] = data.recommended_specialty
        if data.warnings is not None: payload["warnings"] = data.warnings
        if data.similar_cases_distribution is not None: payload["similar_cases_distribution"] = data.similar_cases_distribution
        if data.model_version is not None: payload["model_version"] = data.model_version
        if data.model_source is not None: payload["model_source"] = data.model_source
        if data.fallback_used is not None: payload["fallback_used"] = data.fallback_used
        if data.total_candidates_generated is not None: payload["total_candidates_generated"] = data.total_candidates_generated
        if data.actual_predictions_count is not None: payload["actual_predictions_count"] = data.actual_predictions_count
        if data.fallback_reason is not None: payload["fallback_reason"] = data.fallback_reason
        if data.calibrated_confidence is not None: payload["calibrated_confidence"] = data.calibrated_confidence
        if data.confidence_calibrated is not None: payload["confidence_calibrated"] = data.confidence_calibrated
        if data.urgent_attention is not None: payload["urgent_attention"] = data.urgent_attention
        if data.primary_predictions is not None: payload["primary_predictions"] = data.primary_predictions
        if data.suggested_alternatives is not None: payload["suggested_alternatives"] = data.suggested_alternatives
        if data.prediction_validity is not None: payload["prediction_validity"] = data.prediction_validity
        if data.confidence_band is not None: payload["confidence_band"] = data.confidence_band
        if data.input_quality_score is not None: payload["input_quality_score"] = data.input_quality_score
        if data.missing_inputs is not None: payload["missing_inputs"] = data.missing_inputs
        if data.insufficient_data is not None: payload["insufficient_data"] = data.insufficient_data
        if data.recommended_doctors is not None: payload["recommended_doctors"] = data.recommended_doctors
        if data.priority_recommendation is not None: payload["priority_recommendation"] = data.priority_recommendation
        
        res = await supabase_request("risk_predictions", "POST", data=payload, token=user.token)
        # SUPABASE REST API returns the created object when Prefer=return=representation
        return {"message": "Prediction saved successfully", "data": res[0] if isinstance(res, list) and res else res}
    except Exception as e:
        logger.error(f"Error storing prediction: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save prediction. Please try again.")

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
