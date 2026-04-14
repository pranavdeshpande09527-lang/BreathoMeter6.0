from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class HealthDataCreate(BaseModel):
    age: int = Field(..., gt=0, lt=120)
    height: float = Field(..., gt=30, lt=300, description="Height in cm")
    weight: float = Field(..., gt=1, lt=500, description="Weight in kg")
    smoking_history: bool
    activity_level: str = Field(..., min_length=2, max_length=30, description="Low, Moderate, High")
    respiratory_symptoms: Optional[str] = Field(None, max_length=1000)
    baseline_symptoms: Optional[str] = Field(None, max_length=1000)

class HealthDataResponse(HealthDataCreate):
    id: str
    user_id: str
    bmi: float
    created_at: datetime

    class Config:
        from_attributes = True
