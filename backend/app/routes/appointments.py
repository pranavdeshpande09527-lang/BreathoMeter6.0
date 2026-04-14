from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from datetime import datetime
from app.core.dependencies import get_current_user, require_role
from app.database import supabase_request
from app.core.rate_limit import limiter
from app.core.security import ensure_appointment_participant, sanitize_free_text, validate_identifier
from app.utils.logger import app_logger

router = APIRouter(prefix="/appointments", tags=["Appointments"])

class AppointmentRequest(BaseModel):
    doctor_id: str
    patient_name: str = Field(..., min_length=2, max_length=120)
    disease: str = Field(..., min_length=2, max_length=200)
    model_config = ConfigDict(extra="forbid")

class AppointmentMessage(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    model_config = ConfigDict(extra="forbid")

def is_doctor(user):
    """Role detection: trusts user_metadata.role set by backend at signup."""
    metadata = getattr(user, 'user_metadata', {}) or {}
    role = str(metadata.get('role', '')).lower()
    return role == 'doctor'

@router.post("/message/{appointment_id}")
@limiter.limit("20/minute")
async def post_message(request: Request, appointment_id: str, msg: AppointmentMessage, user = Depends(get_current_user)):
    # 1. Fetch current messages
    try:
        appt = await ensure_appointment_participant(appointment_id, user)
        messages = appt.get("messages", [])
        
        # 2. Add new message
        new_msg = {
            "sender_id": user.id,
            "role": "doctor" if is_doctor(user) else "patient",
            "content": sanitize_free_text(msg.content, max_length=2000, field_name="message"),
            "timestamp": datetime.now().isoformat()
        }
        messages.append(new_msg)
        
        # 3. Save back
        await supabase_request("appointments", "PATCH", {"messages": messages}, query_params={"id": "eq." + appointment_id}, token=user.token)
        return {"message": "Message sent"}
    except HTTPException:
        raise
    except Exception as e:
        app_logger.error(f"Failed to post message to {appointment_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/message/{appointment_id}")
async def get_messages(appointment_id: str, user = Depends(get_current_user)):
    try:
        appt = await ensure_appointment_participant(appointment_id, user)
        return {"messages": appt.get("messages", [])}
    except HTTPException:
        raise
    except Exception as e:
        app_logger.error(f"Failed to get messages for {appointment_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/request")
@limiter.limit("10/minute")
async def request_appointment(request: Request, req: AppointmentRequest, user = Depends(get_current_user)):
    try:
        validate_identifier(req.doctor_id, "doctor_id")
        # Check if already requested
        existing = await supabase_request("appointments", "GET", query_params={
            "patient_id": "eq." + user.id,
            "doctor_id": "eq." + req.doctor_id,
            "status": "in.(pending,accepted)"
        }, token=user.token)
        
        if existing:
            return {"message": existing[0]["status"] + " request exists", "appointment_id": existing[0]["id"]}
            
        new_app = {
            "patient_id": user.id,
            "patient_name": sanitize_free_text(req.patient_name, max_length=120, field_name="patient_name"),
            "doctor_id": req.doctor_id,
            "disease": sanitize_free_text(req.disease, max_length=200, field_name="disease"),
            "status": "pending",
            "messages": []
        }
        
        res = await supabase_request("appointments", "POST", new_app, token=user.token)
        # Note: res might be empty or the object depending on PostgREST settings
        # We try to find it again to return the ID if not in res
        if res and isinstance(res, list) and len(res) > 0:
            return {"message": "Appointment requested", "appointment_id": res[0].get("id")}
        
        # Fallback to fetching recent one if POST response didn't include data
        latest = await supabase_request("appointments", "GET", query_params={
            "patient_id": "eq." + user.id,
            "order": "created_at.desc",
            "limit": "1"
        }, token=user.token)
        
        return {"message": "Appointment requested", "appointment_id": latest[0]["id"] if latest else None}
    except HTTPException:
        raise
    except Exception as e:
        app_logger.error(f"Failed to request appointment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/doctor")
async def get_doctor_appointments(user = Depends(require_role(["doctor"]))):
    try:
        res = await supabase_request("appointments", "GET", query_params={
            "doctor_id": "eq." + user.id,
            "order": "created_at.desc"
        }, token=user.token)
        return {"appointments": res or []}
    except Exception as e:
        app_logger.error(f"Failed to fetch doctor appointments: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/patient")
async def get_patient_appointments(user = Depends(get_current_user)):
    try:
        res = await supabase_request("appointments", "GET", query_params={
            "patient_id": "eq." + user.id,
            "order": "created_at.desc"
        }, token=user.token)
        patient_apps = res or []
        
        # Enrich with doctor names
        if patient_apps:
            doctor_ids = sorted({a.get("doctor_id") for a in patient_apps if a.get("doctor_id")})
            if doctor_ids:
                docs_res = await supabase_request(
                    "users",
                    "GET",
                    query_params={
                        "id": f"in.({','.join(doctor_ids)})",
                        "select": "id,first_name,last_name,email",
                    },
                    token=user.token,
                )
                doc_map = {
                    d["id"]: (" ".join(filter(None, [d.get("first_name"), d.get("last_name")])).strip() or d.get("email"))
                    for d in (docs_res or [])
                }
                for a in patient_apps:
                    a["doctor_name"] = doc_map.get(a["doctor_id"], "Unknown Doctor")
        
        return {"appointments": patient_apps}
    except Exception as e:
        app_logger.error(f"Failed to fetch patient appointments: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/accept/{appointment_id}")
async def accept_appointment(appointment_id: str, user = Depends(require_role(["doctor"]))):
    try:
        # Verify ownership and update status
        res = await supabase_request("appointments", "PATCH", 
            {"status": "accepted"}, 
            query_params={"id": "eq." + appointment_id, "doctor_id": "eq." + user.id}, 
            token=user.token
        )
        return {"message": "Appointment accepted"}
    except Exception as e:
        app_logger.error(f"Failed to accept appointment {appointment_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
