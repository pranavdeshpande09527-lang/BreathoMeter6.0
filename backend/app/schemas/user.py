from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class HealthProfileBase(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    smoking_status: Optional[str] = None
    activity_level: Optional[str] = None
    blood_group: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    known_conditions: Optional[str] = None

class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role: Optional[str] = "patient"
    # Optional profile data at signup
    age: Optional[int] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    smoking_status: Optional[str] = None
    activity_level: Optional[str] = None
    specialty: Optional[str] = None
    experience: Optional[str] = None
    medical_license: Optional[str] = None
    availability: Optional[str] = None
    date_of_birth: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(UserBase):
    id: str
    created_at: datetime
    role: str
    profile: Optional[HealthProfileBase] = None
    
    class Config:
        from_attributes = True
