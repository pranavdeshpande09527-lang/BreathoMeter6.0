from fastapi import APIRouter, Depends, HTTPException, Request
from app.schemas.health_data import HealthDataCreate
from app.core.dependencies import get_current_user
from app.database import supabase_request
from app.core.rate_limit import limiter

router = APIRouter(prefix="/health", tags=["Health Data"])


@router.post("/input")
@limiter.limit("20/minute")
async def submit_health_data(request: Request, data: HealthDataCreate, user=Depends(get_current_user)):
    """Store health data for the authenticated user."""
    bmi = data.weight / ((data.height / 100) ** 2)

    health_record = {
        "user_id": user.id,
        "age": data.age,
        "height": data.height,
        "weight": data.weight,
        "bmi": round(bmi, 2),
        "smoking_history": data.smoking_history,
        "activity_level": data.activity_level,
        "respiratory_symptoms": data.respiratory_symptoms,
        "baseline_symptoms": data.baseline_symptoms
    }

    try:
        response = await supabase_request("health_data", "POST", health_record, token=user.token)
        if not response:
            raise HTTPException(status_code=500, detail="Failed to save health data")
        return {"message": "Health data saved successfully", "data": response[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/latest")
async def get_latest_health_data(user=Depends(get_current_user)):
    """Fetch the latest health data for the authenticated user (real-time dashboard)."""
    try:
        response = await supabase_request("health_data", "GET", query_params={
            "user_id": f"eq.{user.id}",
            "order": "created_at.desc",
            "limit": "1"
        }, token=user.token)
        if not response:
            return {"message": "No health data found", "data": None}
        return {"data": response[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
