from fastapi import APIRouter, HTTPException, Depends, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
import re
from app.schemas.user import UserCreate, UserLogin
from app.database import supabase_auth_request, supabase_admin_auth_request, supabase_admin_request
from app.config import settings
from app.utils.logger import app_logger
from app.utils.rate_limit import check_rate_limit
from app.utils.email import send_verification_email

router = APIRouter(prefix="/auth", tags=["Authentication"])
from app.core.dependencies import get_current_user


def is_strong_password(password: str) -> bool:
    """Enforces minimum password strength: 8 chars, 1 number, 1 uppercase."""
    if len(password) < 8: return False
    if not any(char.isdigit() for char in password): return False
    if not any(char.isupper() for char in password): return False
    return True

@router.post("/signup")
async def signup(user: UserCreate, request: Request):
    """
    Handles user signup with environment-based verification bypass.
    Limits: 5 requests per minute per IP.
    """
    # 1. Backend Rate Limiting (Sliding Window)
    await check_rate_limit(request, limit=5, window_seconds=60)
    
    # 2. Security Validations
    role = user.role.lower() if user.role else "patient"
    if role not in ["patient", "doctor"]:
        app_logger.warning(f"Signup attempt with invalid role: {role} for email: {user.email}")
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'patient' or 'doctor'.")
        
    if not is_strong_password(user.password):
        app_logger.warning(f"Signup attempt with weak password for email: {user.email}")
        raise HTTPException(
            status_code=400, 
            detail="Password must be at least 8 characters long, contain a number, and an uppercase letter."
        )
    
    app_logger.info(f"Processing {role} signup for: {user.email} (Env: {settings.environment})")
    
    user_metadata = {
        "full_name": user.full_name,
        "role": role
    }

    try:
        if settings.environment == "development":
            # --- Development Mode: Bypass Email Verification ---
            app_logger.info(f"Dev Mode: Creating confirmed user for {user.email}")
            
            if not settings.supabase_service_role_key:
                app_logger.warning("SUPABASE_SERVICE_ROLE_KEY missing. Falling back to standard signup.")
                try:
                    resp = await supabase_auth_request("signup", "POST", {
                        "email": user.email,
                        "password": user.password,
                        "data": user_metadata
                    })
                except Exception as e:
                    error_msg = str(e).lower()
                    if "already registered" in error_msg:
                        raise HTTPException(status_code=400, detail="User already registered.")
                    if "rate limit" in error_msg:
                        raise HTTPException(status_code=429, detail="Signup rate limit exceeded. Please try again later.")
                    raise e
                
                session = resp.get("session")
                user_obj = resp.get("user") or (session.get("user") if session else None)
                if user_obj:
                    try:
                        await supabase_admin_request("users", "POST", {"id": user_obj["id"], "email": user_obj["email"], "role": role})
                    except Exception as db_e:
                        app_logger.warning(f"Failed to create public record for {user.email}: {db_e}")
                
                if session:
                    return {
                        "message": "Signup successful! Welcome to Breathometer.",
                        "email_confirmation_required": False,
                        "session": session
                    }
                return {
                    "message": "Account created! Please check your email to verify your account.",
                    "email_confirmation_required": True,
                    "user": user_obj or {}
                }
            
            # Using Admin API to create a confirmed user
            try:
                # Note: Supabase Admin API endpoint for user creation is /users
                create_resp = await supabase_admin_auth_request("users", "POST", {
                    "email": user.email,
                    "password": user.password,
                    "email_confirm": True,
                    "user_metadata": user_metadata
                })
            except Exception as e:
                error_msg = str(e).lower()
                if "already registered" in error_msg:
                    raise HTTPException(status_code=400, detail="User already registered.")
                if "rate limit" in error_msg:
                    raise HTTPException(status_code=429, detail="Signup rate limit exceeded. Please try again later.")
                raise e
            
            # Automatically log the user in to return a session
            login_resp = await supabase_auth_request("token?grant_type=password", "POST", {
                "email": user.email,
                "password": user.password
            })
            
            user_obj = login_resp.get("user")
            if user_obj:
                try:
                    await supabase_admin_request("users", "POST", {"id": user_obj["id"], "email": user_obj["email"], "role": role})
                except Exception as db_e:
                    app_logger.warning(f"Failed to create public record for {user.email}: {db_e}")

            
            return {
                "message": "Signup successful! Welcome to Breathometer.",
                "email_confirmation_required": False,
                "session": {
                    "access_token": login_resp.get("access_token"),
                    "token_type": login_resp.get("token_type"),
                    "expires_in": login_resp.get("expires_in"),
                    "refresh_token": login_resp.get("refresh_token"),
                    "user": login_resp.get("user")
                }
            }
            
        else:
            # --- Production Mode: Secure SMTP Verification ---
            app_logger.info(f"Prod Mode: Generating verification link for {user.email}")
            
            try:
                # Generate a signup verification link
                gen_resp = await supabase_admin_auth_request("generate_link", "POST", {
                    "type": "signup",
                    "email": user.email,
                    "password": user.password,
                    "data": user_metadata
                })
            except Exception as e:
                error_msg = str(e).lower()
                if "already registered" in error_msg:
                    raise HTTPException(status_code=400, detail="User already registered.")
                if "rate limit" in error_msg:
                    raise HTTPException(status_code=429, detail="Signup rate limit exceeded. Please try again later.")
                raise e
                
            action_link = gen_resp.get("properties", {}).get("action_link") or gen_resp.get("action_link")
            
            if not action_link:
                app_logger.error(f"Failed to generate link for {user.email}: {gen_resp}")
                raise HTTPException(status_code=500, detail="Internal server error generating verification link.")
                
            # Send HTML email via SMTP
            email_sent = await send_verification_email(user.email, action_link)
            if not email_sent:
                raise HTTPException(status_code=503, detail="Email service temporarily unavailable. Please try again later.")
                
            user_obj = gen_resp.get("user")
            if user_obj:
                try:
                    await supabase_admin_request("users", "POST", {"id": user_obj["id"], "email": user_obj["email"], "role": role})
                except Exception as db_e:
                    app_logger.warning(f"Failed to create public record for {user.email}: {db_e}")

            return {
                "message": "Account created! Please check your email to verify your account.",
                "email_confirmation_required": True,
                "user": user_obj or {}
            }

    except HTTPException:
        raise
    except Exception as e:
        app_logger.error(f"Unexpected signup error for {user.email}: {str(e)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred during signup.")

@router.post("/login")
async def login(user: UserLogin):
    """Handles user login with standard Supabase Auth."""
    try:
        response = await supabase_auth_request("token?grant_type=password", "POST", {
            "email": user.email,
            "password": user.password
        })
        return {
            "message": "Login successful",
            "session": {
                "access_token": response.get("access_token"),
                "token_type": response.get("token_type"),
                "expires_in": response.get("expires_in"),
                "refresh_token": response.get("refresh_token"),
                "user": response.get("user")
            }
        }
    except Exception as e:
        error_msg = str(e)
        if "Email not confirmed" in error_msg:
            raise HTTPException(
                status_code=403,
                detail="Email not confirmed. Please check your inbox and confirm your email before logging in."
            )
        if "rate limit" in error_msg.lower():
            raise HTTPException(
                status_code=429,
                detail="Too many login attempts. Please try again later."
            )
        app_logger.error(f"Login error for email {user.email}: {e}")
        raise HTTPException(status_code=401, detail="Invalid email or password.")

@router.get("/profile")
async def get_profile(user=Depends(get_current_user)):
    """Generic profile fetcher using JWT."""
    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    }


class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    blood_group: Optional[str] = None
    known_conditions: Optional[str] = None


@router.patch("/profile")
async def update_profile(data: ProfileUpdate, user=Depends(get_current_user)):
    """Update the authenticated user's profile fields."""
    from app.database import supabase_admin_auth_request, supabase_request

    full_name = " ".join(filter(None, [data.first_name, data.last_name])) or None

    try:
        # 1. Update Supabase Auth user_metadata (display name in token)
        await supabase_admin_auth_request(
            f"users/{user.id}",
            "PUT",
            {"user_metadata": {"full_name": full_name or user.full_name}}
        )
    except Exception as e:
        app_logger.warning(f"Could not update Supabase auth metadata for {user.id}: {e}")

    try:
        # 2. Upsert profile data into health_profiles table
        profile_record = {
            "user_id": user.id,
            "first_name": data.first_name,
            "last_name": data.last_name,
            "phone": data.phone,
            "date_of_birth": data.date_of_birth,
            "blood_group": data.blood_group,
            "known_conditions": data.known_conditions,
        }
        # Remove None values to allow partial updates
        profile_record = {k: v for k, v in profile_record.items() if v is not None}

        # Try to PATCH (update) existing row first
        patched = await supabase_request(
            "health_profiles",
            "PATCH",
            profile_record,
            query_params={"user_id": f"eq.{user.id}"}
        )

        # If no row existed (empty result), insert a new one
        if patched == []:
            await supabase_request("health_profiles", "POST", {"user_id": user.id, **profile_record})

    except Exception as e:
        app_logger.error(f"Failed to save health_profiles for user {user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save profile data: {str(e)}")

    return {
        "message": "Profile updated successfully",
        "profile": {
            "first_name": data.first_name,
            "last_name": data.last_name,
            "full_name": full_name,
            "phone": data.phone,
            "date_of_birth": data.date_of_birth,
            "blood_group": data.blood_group,
            "known_conditions": data.known_conditions,
        }
    }


@router.get("/patients")
async def list_patients(user=Depends(get_current_user)):
    """
    Returns all users with role='patient'.
    Requires the caller to be a doctor (enforced by RLS policies).
    """
    from app.database import supabase_request
    
    try:
        # We use the user's token so RLS policies for doctors are applied
        res = await supabase_request(
            "users", 
            "GET", 
            query_params={"role": "eq.patient", "order": "created_at.desc"}, 
            token=user.token
        )
        return {"patients": res or []}
    except Exception as e:
        app_logger.error(f"Failed to list patients: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Could not retrieve patient list: {str(e)}")


@router.get("/patients/{patient_id}")
async def get_patient_detail(patient_id: str, user=Depends(get_current_user)):
    """
    Returns detailed patient info including latest risk prediction and breath tests.
    Requires the caller to be a doctor (enforced by RLS policies).
    """
    from app.database import supabase_request
    
    try:
        # 1. Get patient profile from users table
        user_res = await supabase_request("users", "GET", query_params={"id": f"eq.{patient_id}"}, token=user.token)
        patient = user_res[0] if user_res else {}
        
        # 2. Get health profile if exists
        try:
            hp_res = await supabase_request("health_profiles", "GET", query_params={"user_id": f"eq.{patient_id}", "limit": "1"}, token=user.token)
            health_profile = hp_res[0] if hp_res else {}
        except Exception:
            health_profile = {}
        
        # 3. Get latest risk prediction
        try:
            pred_res = await supabase_request("risk_predictions", "GET", query_params={"user_id": f"eq.{patient_id}", "order": "created_at.desc", "limit": "1"}, token=user.token)
            latest_prediction = pred_res[0] if pred_res else {}
        except Exception:
            latest_prediction = {}
        
        # 4. Get latest breath test
        try:
            bt_res = await supabase_request("breath_tests", "GET", query_params={"user_id": f"eq.{patient_id}", "order": "created_at.desc", "limit": "1"}, token=user.token)
            latest_breath_test = bt_res[0] if bt_res else {}
        except Exception:
            latest_breath_test = {}
        
        # 5. Get recent prediction history (for trend)
        try:
            trend_res = await supabase_request("risk_predictions", "GET", query_params={"user_id": f"eq.{patient_id}", "select": "final_risk_score,created_at", "order": "created_at.desc", "limit": "6"}, token=user.token)
            prediction_trend = trend_res or []
        except Exception:
            prediction_trend = []
        
        return {
            "patient": patient,
            "health_profile": health_profile,
            "latest_prediction": latest_prediction,
            "latest_breath_test": latest_breath_test,
            "prediction_trend": prediction_trend
        }
    except Exception as e:
        app_logger.error(f"Failed to get patient detail for {patient_id}: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve patient details.")

