from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Dict, Any
from datetime import datetime

class HealthProfileBase(BaseModel):
    first_name: Optional[str] = Field(None, max_length=80)
    last_name: Optional[str] = Field(None, max_length=80)
    age: Optional[int] = None
    gender: Optional[str] = Field(None, max_length=30)
    height: Optional[float] = None
    weight: Optional[float] = None
    smoking_status: Optional[str] = Field(None, max_length=30)
    activity_level: Optional[str] = Field(None, max_length=30)
    blood_group: Optional[str] = Field(None, max_length=8)
    phone: Optional[str] = Field(None, max_length=30)
    date_of_birth: Optional[str] = Field(None, max_length=20)
    known_conditions: Optional[str] = Field(None, max_length=1000)
    model_config = ConfigDict(extra="forbid")

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_.-]+$")
    full_name: Optional[str] = Field(None, max_length=120)
    model_config = ConfigDict(extra="forbid")

class UserCreate(UserBase):
    password: str
    role: Optional[str] = "patient"
    # Optional profile data at signup
    age: Optional[int] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    smoking_status: Optional[str] = Field(None, max_length=30)
    activity_level: Optional[str] = Field(None, max_length=30)
    specialty: Optional[str] = Field(None, max_length=120)
    experience: Optional[str] = Field(None, max_length=120)
    medical_license: Optional[str] = Field(None, max_length=120)
    availability: Optional[str] = Field(None, max_length=120)
    date_of_birth: Optional[str] = Field(None, max_length=20)
    metadata: Optional[Dict[str, Any]] = None

class UserLogin(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_.-]+$")
    password: str = Field(..., min_length=8, max_length=200)
    model_config = ConfigDict(extra="forbid")

class UserResponse(UserBase):
    id: str
    created_at: datetime
    role: str
    profile: Optional[HealthProfileBase] = None
    
    class Config:
        from_attributes = True
