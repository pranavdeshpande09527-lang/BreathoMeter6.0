from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import json
import os
import uuid
from datetime import datetime
from app.core.dependencies import get_current_user
from app.database import supabase_request, supabase_admin_request, supabase_admin_auth_request
from app.utils.logger import app_logger

router = APIRouter(prefix="/appointments", tags=["Appointments"])

class AppointmentRequest(BaseModel):
    doctor_id: str
    patient_name: str
    disease: str

class AppointmentMessage(BaseModel):
    content: str

def is_doctor(user):
    """Robust role detection matching frontend heuristics."""
    metadata = getattr(user, 'user_metadata', {}) or {}
    role = str(metadata.get('role', '')).lower()
    full_name = str(metadata.get('full_name', '')).lower()
    email = str(getattr(user, 'email', '')).lower()
    
    if role == 'doctor':
        return True
    # Heuristic for cases where Supabase metadata isn't set yet but name is Dr.
    if full_name.startswith('dr. ') or email.startswith('dr.'):
        return True
    return False

@router.post("/message/{appointment_id}")
async def post_message(appointment_id: str, msg: AppointmentMessage, user = Depends(get_current_user)):
    # 1. Fetch current messages
    try:
        res = await supabase_request("appointments", "GET", query_params={"id": "eq." + appointment_id}, token=user.token)
        if not res:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        appt = res[0]
        messages = appt.get("messages", [])
        
        # 2. Add new message
        new_msg = {
            "sender_id": user.id,
            "role": "doctor" if is_doctor(user) else "patient",
            "content": msg.content,
            "timestamp": datetime.now().isoformat()
        }
        messages.append(new_msg)
        
        # 3. Save back
        await supabase_request("appointments", "PATCH", {"messages": messages}, query_params={"id": "eq." + appointment_id}, token=user.token)
        return {"message": "Message sent"}
    except Exception as e:
        app_logger.error(f"Failed to post message to {appointment_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/message/{appointment_id}")
async def get_messages(appointment_id: str, user = Depends(get_current_user)):
    try:
        res = await supabase_request("appointments", "GET", query_params={"id": "eq." + appointment_id}, token=user.token)
        if not res:
            raise HTTPException(status_code=404, detail="Appointment not found")
        return {"messages": res[0].get("messages", [])}
    except Exception as e:
        app_logger.error(f"Failed to get messages for {appointment_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/request")
async def request_appointment(req: AppointmentRequest, user = Depends(get_current_user)):
    try:
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
            "patient_name": req.patient_name,
            "doctor_id": req.doctor_id,
            "disease": req.disease,
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
    except Exception as e:
        app_logger.error(f"Failed to request appointment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/doctor")
async def get_doctor_appointments(user = Depends(get_current_user)):
    if not is_doctor(user):
        app_logger.warning(f"Unauthorized doctor check by {user.id}")
        raise HTTPException(status_code=403, detail="Not authorized as doctor")
        
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
            # Enrichment: Fetch all users to map IDs to names
            docs_res = await supabase_admin_auth_request("users", "GET")
            if docs_res and "users" in docs_res:
                doc_map = {d["id"]: d.get("user_metadata", {}).get("full_name") or d.get("email") for d in docs_res["users"]}
                for a in patient_apps:
                    a["doctor_name"] = doc_map.get(a["doctor_id"], "Unknown Doctor")
        
        return {"appointments": patient_apps}
    except Exception as e:
        app_logger.error(f"Failed to fetch patient appointments: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/accept/{appointment_id}")
async def accept_appointment(appointment_id: str, user = Depends(get_current_user)):
    if not is_doctor(user):
        raise HTTPException(status_code=403, detail="Not authorized")
        
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
