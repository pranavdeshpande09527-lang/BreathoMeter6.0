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
from app.core.dependencies import get_current_user, require_role


def is_strong_password(password: str) -> bool:
    """Enforces minimum password strength: 8 chars, 1 number, 1 uppercase."""
    if len(password) < 8: return False
    if not any(char.isdigit() for char in password): return False
    if not any(char.isupper() for char in password): return False
    return True

@router.post("/signup")
async def signup(user: UserCreate, request: Request):
    """
    Handles user signup with pseudo-email to enforce unique identity.
    Limits: 5 requests per minute per IP.
    """
    # 1. Backend Rate Limiting (Sliding Window)
    await check_rate_limit(request, limit=5, window_seconds=60)
    
    # 2. Security Validations
    role = user.role.lower() if user.role else "patient"
    if role not in ["patient", "doctor"]:
        app_logger.warning(f"Signup attempt with invalid role: {role} for username: {user.username}")
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'patient' or 'doctor'.")
        
    if not is_strong_password(user.password):
        app_logger.warning(f"Signup attempt with weak password for username: {user.username}")
        raise HTTPException(
            status_code=400, 
            detail="Password must be at least 8 characters long, contain a number, and an uppercase letter."
        )
    
    app_logger.info(f"Processing {role} signup for: {user.username} (Env: {settings.environment})")
    
    user_metadata = {
        "full_name": user.full_name,
        "role": role,
        "username": user.username,
        "specialty": getattr(user, "specialty", None),
        "experience": getattr(user, "experience", None),
        "medical_license": getattr(user, "medical_license", None),
        "date_of_birth": getattr(user, "date_of_birth", None),
        "availability": getattr(user, "availability", None)
    }
    
    pseudo_email = f"{user.username}@breathometer.local"

    try:
        # We bypass SMTP entirely by using the Admin API and enforcing confirmation.
        app_logger.info(f"Creating confirmed user for {user.username} via Admin API")
        
        try:
            create_resp = await supabase_admin_auth_request("users", "POST", {
                "email": pseudo_email,
                "password": user.password,
                "email_confirm": True,
                "user_metadata": user_metadata
            })
        except Exception as e:
            error_msg = str(e).lower()
            if "already registered" in error_msg or "already been registered" in error_msg or "email_exists" in error_msg:
                raise HTTPException(status_code=400, detail="Username already registered.")
            if "rate limit" in error_msg:
                raise HTTPException(status_code=429, detail="Signup rate limit exceeded. Please try again later.")
            raise e
        
        # Automatically log the user in to return a session
        login_resp = await supabase_auth_request("token?grant_type=password", "POST", {
            "email": pseudo_email,
            "password": user.password
        })
        
        user_obj = login_resp.get("user")
        if user_obj:
            try:
                # 1. Create entry in users table
                first_name, *last_name_parts = user.full_name.split(" ") if user.full_name else ("", "")
                last_name = " ".join(last_name_parts) if last_name_parts else ""
                
                await supabase_admin_request("users", "POST", {
                    "id": user_obj["id"], 
                    "email": pseudo_email, 
                    "role": role,
                    "first_name": first_name,
                    "last_name": last_name
                })
                
                # 2. Create entry in health_profiles table if it's a patient
                if role == "patient":
                    profile_data = {
                        "user_id": user_obj["id"],
                        "first_name": first_name,
                        "last_name": last_name,
                        "age": user.age,
                        "gender": user.gender,
                        "height": user.height,
                        "weight": user.weight,
                        "smoking_status": user.smoking_status,
                        "activity_level": user.activity_level
                    }
                    # Remove None values
                    profile_data = {k: v for k, v in profile_data.items() if v is not None}
                    await supabase_admin_request("health_profiles", "POST", profile_data)
                    
            except Exception as db_e:
                app_logger.warning(f"Failed to create public/profile record for {user.username}: {db_e}")

        # Construct final user object with profile
        final_user = login_resp.get("user", {})
        final_user["username"] = user.username
        
        return {
            "message": "Signup successful! Welcome to Breathometer.",
            "email_confirmation_required": False,
            "session": {
                "access_token": login_resp.get("access_token"),
                "token_type": login_resp.get("token_type"),
                "expires_in": login_resp.get("expires_in"),
                "refresh_token": login_resp.get("refresh_token"),
                "user": final_user
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        app_logger.error(f"Unexpected signup error for {user.username}: {str(e)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred during signup.")

@router.post("/login")
async def login(user: UserLogin):
    """Handles user login with standard Supabase Auth."""
    pseudo_email = f"{user.username}@breathometer.local"
    try:
        response = await supabase_auth_request("token?grant_type=password", "POST", {
            "email": pseudo_email,
            "password": user.password
        })
        
        user_obj = response.get("user", {})
        if user_obj:
            user_obj["username"] = user.username
            
        return {
            "message": "Login successful",
            "session": {
                "access_token": response.get("access_token"),
                "token_type": response.get("token_type"),
                "expires_in": response.get("expires_in"),
                "refresh_token": response.get("refresh_token"),
                "user": user_obj
            }
        }
    except Exception as e:
        error_msg = str(e)
        if "Email not confirmed" in error_msg:
            raise HTTPException(
                status_code=403,
                detail="Account not confirmed. Please contact support."
            )
        if "rate limit" in error_msg.lower():
            raise HTTPException(
                status_code=429,
                detail="Too many login attempts. Please try again later."
            )
        app_logger.error(f"Login error for username {user.username}: {e}")
        raise HTTPException(status_code=401, detail="Invalid username or password.")

@router.get("/profile")
async def get_profile(user=Depends(get_current_user)):
    """Generic profile fetcher using JWT. Includes health profile if applicable."""
    from app.database import supabase_request
    username = user.email.replace("@breathometer.local", "") if user.email else None
    
    profile_data = {}
    try:
        hp_res = await supabase_request("health_profiles", "GET", query_params={"user_id": f"eq.{user.id}", "limit": "1"}, token=user.token)
        if hp_res:
            profile_data = hp_res[0]
    except Exception as e:
        app_logger.warning(f"Failed to fetch health profile for user {user.id}: {e}")

    return {
        "user": {
            "id": user.id,
            "username": username,
            "full_name": user.full_name,
            "role": user.role,
            "profile": profile_data
        }
    }


class ForgotPasswordRequest(BaseModel):
    email: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, request: Request):
    """
    Triggers a password-reset email via Supabase Admin API.
    Always returns 200 to prevent email enumeration attacks.
    """
    await check_rate_limit(request, limit=3, window_seconds=60)
    try:
        email = req.email.strip().lower()
        # Use the Supabase Admin auth endpoint to generate a recovery link
        await supabase_admin_auth_request(
            "recover",
            "POST",
            {"email": email}
        )
        app_logger.info(f"Password reset requested for: {email}")
    except Exception as e:
        # Log but never reveal whether the email exists (security: enumeration prevention)
        app_logger.warning(f"Forgot-password error (suppressed): {e}")
    return {"message": "If that email is registered, a password reset link has been sent."}


@router.post("/refresh")
async def refresh_token(req: RefreshTokenRequest):
    """
    Silently exchanges a Supabase refresh_token for a new access_token.
    Called by the frontend proactively ~5 minutes before expiry.
    """
    try:
        response = await supabase_auth_request("token?grant_type=refresh_token", "POST", {
            "refresh_token": req.refresh_token
        })
        return {
            "access_token": response.get("access_token"),
            "refresh_token": response.get("refresh_token"),
            "expires_in": response.get("expires_in"),
            "user": response.get("user")
        }
    except Exception as e:
        app_logger.warning(f"Token refresh failed: {e}")
        raise HTTPException(status_code=401, detail="Token refresh failed. Please log in again.")

class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    blood_group: Optional[str] = None
    known_conditions: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    smoking_status: Optional[str] = None
    activity_level: Optional[str] = None


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
            "age": data.age,
            "gender": data.gender,
            "height": data.height,
            "weight": data.weight,
            "smoking_status": data.smoking_status,
            "activity_level": data.activity_level,
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
            "age": data.age,
            "gender": data.gender,
            "height": data.height,
            "weight": data.weight,
            "smoking_status": data.smoking_status,
            "activity_level": data.activity_level
        }
    }


@router.get("/doctors")
async def list_doctors(user=Depends(get_current_user)):
    """
    Returns all users with role='doctor'.
    """
    from app.database import supabase_admin_auth_request
    
    try:
        users_resp = await supabase_admin_auth_request("users", "GET")
        doctors = []
        for u in users_resp.get("users", []):
            meta = u.get("user_metadata", {})
            role_meta = str(meta.get("role", "")).lower()
            name_meta = str(meta.get("full_name", "")).lower()
            email_u = str(u.get("email", "")).lower()
            
            # Use robust heuristic MATCHING is_doctor and frontend logic
            is_doc = role_meta == "doctor" or name_meta.startswith("dr. ") or email_u.startswith("dr.")
            
            if is_doc:
                doctors.append({
                    "id": u["id"],
                    "email": u.get("email"),
                    "full_name": meta.get("full_name") or u.get("email"),
                    "specialty": meta.get("specialty"),
                    "experience": meta.get("experience"),
                    "availability": meta.get("availability")
                })
        return {"doctors": doctors}
    except Exception as e:
        from app.utils.logger import app_logger
        app_logger.error(f"Failed to list doctors: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Could not retrieve doctor list: {str(e)}")


@router.get("/patients")
async def list_patients(user=Depends(require_role(["doctor"]))):
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
        patients = res or []
        
        # Enrich patients with the latest risk category
        try:
            for p in patients:
                pred_res = await supabase_request(
                    "risk_predictions", 
                    "GET", 
                    query_params={"user_id": f"eq.{p.get('id')}", "select": "risk_category,final_risk_score", "order": "created_at.desc", "limit": "1"}, 
                    token=user.token
                )
                if pred_res:
                    p['risk_category'] = pred_res[0].get("risk_category")
                    p['risk'] = pred_res[0].get("risk_category")
                    p['risk_score'] = pred_res[0].get("final_risk_score")
        except Exception as inner_e:
            app_logger.warning(f"Failed to fetch risk data for patients: {inner_e}")

        return {"patients": patients}
    except Exception as e:
        app_logger.error(f"Failed to list patients: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Could not retrieve patient list: {str(e)}")


@router.get("/patients/{patient_id}")
async def get_patient_detail(patient_id: str, user=Depends(require_role(["doctor"]))):
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

