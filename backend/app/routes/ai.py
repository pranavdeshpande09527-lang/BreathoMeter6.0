from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from app.services.ai_service import ai_service
from app.core.dependencies import get_current_user
from app.core.rate_limit import limiter
from app.core.security import sanitize_free_text

router = APIRouter(prefix="/ai", tags=["AI Explanations"])

class ExplanationRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=300)
    user_context: Optional[dict] = {}
    model_config = ConfigDict(extra="forbid")

class ExplanationResponse(BaseModel):
    explanation: str

@router.post("/explanation", response_model=ExplanationResponse)
@limiter.limit("10/minute")
async def get_explanation(http_request: Request, request: ExplanationRequest, user = Depends(get_current_user)):
    safe_topic = sanitize_free_text(request.topic, max_length=300, field_name="topic")
    explanation = await ai_service.generate_explanation(safe_topic, request.user_context)
    return {"explanation": explanation}
