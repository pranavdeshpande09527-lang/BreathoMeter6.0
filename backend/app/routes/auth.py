from fastapi import APIRouter, HTTPException, Depends, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Optional
import re
import traceback
import asyncio
from app.schemas.user import UserCreate, UserLogin
from app.database import supabase_auth_request, supabase_admin_auth_request, supabase_admin_request
from app.config import settings
from app.core.security import ensure_doctor_patient_access, get_doctor_patient_ids, redact_value, sanitize_free_text
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
    
    app_logger.info(f"Processing {role} signup for: {redact_value(user.username)} (Env: {settings.environment})")
    
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
        # ── Step 1: Create user via the PUBLIC Supabase signup endpoint ───────
        # No SUPABASE_SERVICE_ROLE_KEY needed here.
        app_logger.info(f"[SIGNUP] Step 1 — Creating auth user for: {user.username}")
        try:
            create_resp = await supabase_auth_request("signup", "POST", {
                "email": pseudo_email,
                "password": user.password,
                "data": user_metadata
            })
            created_user_id = create_resp.get("id")
            app_logger.info(f"[SIGNUP] Step 1 OK — auth user created, id={created_user_id}")
        except Exception as e:
            error_msg = str(e).lower()
            app_logger.error(f"[SIGNUP] Step 1 FAILED — signup error: {e}")
            if "already registered" in error_msg or "email_exists" in error_msg or "user already registered" in error_msg:
                raise HTTPException(status_code=400, detail="Username already registered.")
            if "rate limit" in error_msg:
                raise HTTPException(status_code=429, detail="Signup rate limit exceeded. Please try again later.")
            raise HTTPException(status_code=500, detail=f"Account creation failed: {str(e)}")

        # ── Step 2: Attempt to log in immediately ─────────────────────────────
        # Works when Supabase "Confirm email" is DISABLED (preferred for username-based apps).
        # If it fails due to email confirmation, Step 2b uses admin API as fallback.
        app_logger.info(f"[SIGNUP] Step 2 — Logging in for: {user.username}")
        login_resp = None
        try:
            login_resp = await supabase_auth_request("token?grant_type=password", "POST", {
                "email": pseudo_email,
                "password": user.password
            })
            app_logger.info(f"[SIGNUP] Step 2 OK — session obtained directly")
        except Exception as login_err:
            login_err_msg = str(login_err).lower()
            app_logger.warning(f"[SIGNUP] Step 2 — direct login failed: {login_err}")

            # ── Step 2b: Admin-confirm then retry login (fallback if email confirm is ON) ──
            if "email not confirmed" in login_err_msg or "not confirmed" in login_err_msg:
                if settings.supabase_service_role_key and created_user_id:
                    app_logger.info(f"[SIGNUP] Step 2b — confirming user via admin API")
                    try:
                        await supabase_admin_auth_request(f"users/{created_user_id}", "PUT", {
                            "email_confirm": True
                        })
                        login_resp = await supabase_auth_request("token?grant_type=password", "POST", {
                            "email": pseudo_email,
                            "password": user.password
                        })
                        app_logger.info(f"[SIGNUP] Step 2b OK — confirmed and logged in via admin")
                    except Exception as admin_e:
                        app_logger.error(f"[SIGNUP] Step 2b FAILED — admin confirm error: {admin_e}")
                        raise HTTPException(
                            status_code=500,
                            detail="Account created but login failed. Please disable 'Confirm email' in Supabase Auth settings."
                        )
                else:
                    app_logger.error("[SIGNUP] Step 2b — no service key available to confirm email")
                    raise HTTPException(
                        status_code=500,
                        detail="Account created but login failed. Email confirmation is enabled in Supabase — please disable it in the Supabase Auth dashboard."
                    )
            else:
                raise HTTPException(status_code=500, detail=f"Login after signup failed: {str(login_err)}")

        # ── Step 3: Insert into public tables using the user's own JWT ────────
        user_obj = login_resp.get("user")
        user_token = login_resp.get("access_token")
        if user_obj and user_token:
            from app.database import supabase_request
            first_name, *last_name_parts = user.full_name.split(" ") if user.full_name else ("", "")
            last_name = " ".join(last_name_parts) if last_name_parts else ""

            # 3a. Insert into public.users
            app_logger.info(f"[SIGNUP] Step 3a — Inserting into public.users")
            try:
                await supabase_request("users", "POST", {
                    "id": user_obj["id"],
                    "email": pseudo_email,
                    "role": role,
                    "first_name": first_name,
                    "last_name": last_name
                }, token=user_token)
                app_logger.info(f"[SIGNUP] Step 3a OK")
            except Exception as db_e:
                app_logger.error(f"[SIGNUP] Step 3a FAILED — public.users insert: {db_e}")

            # 3b. Insert into health_profiles (patients only)
            if role == "patient":
                app_logger.info(f"[SIGNUP] Step 3b — Inserting into health_profiles")
                try:
                    profile_data = {
                        "user_id": user_obj["id"],
                        "first_name": first_name,
                        "last_name": last_name,
                        "age": user.age,
                        "gender": user.gender,
                        "height": user.height,
                        "weight": user.weight,
                        "smoking_status": user.smoking_status,
                        "activity_level": user.activity_level,
                    }
                    profile_data = {k: v for k, v in profile_data.items() if v is not None}
                    await supabase_request("health_profiles", "POST", profile_data, token=user_token)
                    app_logger.info(f"[SIGNUP] Step 3b OK")
                except Exception as db_e:
                    app_logger.error(f"[SIGNUP] Step 3b FAILED — health_profiles insert: {db_e}")

        # ── Step 4: Return the session ────────────────────────────────────────
        final_user = login_resp.get("user", {})
        final_user["username"] = user.username
        app_logger.info(f"[SIGNUP] Complete — user {user.username} signed up successfully.")

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
        app_logger.error(f"[SIGNUP] Unhandled error for {user.username}: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Signup failed: {str(e)}")

@router.post("/login")
async def login(user: UserLogin, request: Request):
    """Handles user login with standard Supabase Auth."""
    await check_rate_limit(request, limit=10, window_seconds=60)
    pseudo_email = f"{user.username}@breathometer.local"
    try:
        response = await supabase_auth_request("token?grant_type=password", "POST", {
            "email": pseudo_email,
            "password": user.password
        })
        
        user_obj = response.get("user", {})
        if user_obj:
            user_obj["username"] = user.username
            
            # Fetch the user's health profile so frontend has contact_email etc immediately on login
            try:
                from app.database import supabase_request
                hp_res = await supabase_request("health_profiles", "GET", query_params={"user_id": f"eq.{user_obj['id']}", "limit": "1"}, token=response.get("access_token"))
                if hp_res and len(hp_res) > 0:
                    profile_data = hp_res[0]
                    # Inject contact_email and other profile data directly into user_obj
                    user_obj["contact_email"] = profile_data.get("contact_email")
                    user_obj["first_name"] = profile_data.get("first_name")
                    user_obj["last_name"] = profile_data.get("last_name")
                    user_obj["phone"] = profile_data.get("phone")
                    user_obj["aqi_threshold"] = profile_data.get("aqi_threshold")
            except Exception as e:
                app_logger.warning(f"Could not load health_profile during login for {user.username}: {e}")
            
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
        app_logger.error(f"Login error for username {redact_value(user.username)}: {e}")
        raise HTTPException(status_code=401, detail="Invalid username or password.")

@router.get("/profile")
async def get_profile(user=Depends(get_current_user)):
    """Generic profile fetcher using JWT. Includes health profile if applicable."""
    from app.database import supabase_request
    email = getattr(user, "email", None)
    username = email.replace("@breathometer.local", "") if email else None
    
    profile_data = {}
    try:
        hp_res = await supabase_request("health_profiles", "GET", query_params={"user_id": f"eq.{user.id}", "limit": "1"}, token=user.token)
        if hp_res:
            profile_data = hp_res[0]
    except Exception as e:
        app_logger.warning(f"Failed to fetch health profile for user {user.id}: {e}")

    user_metadata = getattr(user, "user_metadata", {})
    
    return {
        "user": {
            "id": user.id,
            "username": username or user_metadata.get("username"),
            "full_name": user_metadata.get("full_name"),
            "role": user_metadata.get("role") or getattr(user, "role", "patient"),
            "profile": profile_data
        }
    }


class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    model_config = ConfigDict(extra="forbid")

class RefreshTokenRequest(BaseModel):
    refresh_token: str
    model_config = ConfigDict(extra="forbid")

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
    first_name: Optional[str] = Field(None, max_length=80)
    last_name: Optional[str] = Field(None, max_length=80)
    contact_email: Optional[EmailStr] = None  # User's real Gmail for notifications
    phone: Optional[str] = Field(None, max_length=30)
    date_of_birth: Optional[str] = Field(None, max_length=20)
    blood_group: Optional[str] = Field(None, max_length=8)
    known_conditions: Optional[str] = Field(None, max_length=1000)
    age: Optional[int] = None
    gender: Optional[str] = Field(None, max_length=30)
    height: Optional[float] = None
    weight: Optional[float] = None
    smoking_status: Optional[str] = Field(None, max_length=30)
    activity_level: Optional[str] = Field(None, max_length=30)
    aqi_threshold: Optional[int] = None
    model_config = ConfigDict(extra="forbid")


class ChangePasswordRequest(BaseModel):
    new_password: str
    model_config = ConfigDict(extra="forbid")


class NotificationPreferences(BaseModel):
    preferences: dict  # e.g. {"health_alerts": True, "aqi_warnings": False, ...}
    model_config = ConfigDict(extra="forbid")


@router.patch("/profile")
async def update_profile(data: ProfileUpdate, user=Depends(get_current_user)):
    """Update the authenticated user's profile fields."""
    from app.database import supabase_admin_auth_request, supabase_request

    full_name = " ".join(filter(None, [data.first_name, data.last_name])) or None

    # 1. Update Supabase Auth user_metadata (optional — requires service key)
    # Failure here is non-fatal: the health_profiles table is the source of truth.
    if settings.supabase_service_role_key:
        try:
            await supabase_admin_auth_request(
                f"users/{user.id}",
                "PUT",
                {"user_metadata": {"full_name": full_name or user.full_name}}
            )
        except Exception as e:
            app_logger.warning(f"Could not update Supabase auth metadata for {user.id}: {e}")
    else:
        app_logger.info(f"Skipping auth metadata update — SERVICE_ROLE_KEY not configured")

    try:
        # 2. Upsert profile data into health_profiles table using user's JWT.
        # Always include user_id as the conflict-resolution key.
        # Keep None values out of non-email fields, but always include contact_email
        # (even if empty string) so clearing the field is persisted.
        profile_record: dict = {"user_id": user.id}

        # Fields that should only be included if non-None (avoids overwriting with nulls)
        optional_fields = {
            "first_name": sanitize_free_text(data.first_name, max_length=80, field_name="first_name") if data.first_name is not None else None,
            "last_name": sanitize_free_text(data.last_name, max_length=80, field_name="last_name") if data.last_name is not None else None,
            "phone": sanitize_free_text(data.phone, max_length=30, field_name="phone") if data.phone is not None else None,
            "date_of_birth": sanitize_free_text(data.date_of_birth, max_length=20, field_name="date_of_birth") if data.date_of_birth is not None else None,
            "blood_group": sanitize_free_text(data.blood_group, max_length=8, field_name="blood_group") if data.blood_group is not None else None,
            "known_conditions": sanitize_free_text(data.known_conditions, max_length=1000, field_name="known_conditions") if data.known_conditions is not None else None,
            "age": data.age,
            "gender": sanitize_free_text(data.gender, max_length=30, field_name="gender") if data.gender is not None else None,
            "height": data.height,
            "weight": data.weight,
            "smoking_status": sanitize_free_text(data.smoking_status, max_length=30, field_name="smoking_status") if data.smoking_status is not None else None,
            "activity_level": sanitize_free_text(data.activity_level, max_length=30, field_name="activity_level") if data.activity_level is not None else None,
            "aqi_threshold": data.aqi_threshold,
        }
        profile_record.update({k: v for k, v in optional_fields.items() if v is not None})

        # contact_email is always included so the user can set or clear it
        profile_record["contact_email"] = str(data.contact_email) if data.contact_email is not None else None

        # Use PostgREST native UPSERT (POST with merge-duplicates) instead of
        # the fragile PATCH→POST fallback that silently failed on RLS mismatch.
        await supabase_request(
            "health_profiles",
            "POST",
            profile_record,
            query_params={},  # no WHERE needed — conflict on user_id handles it
            token=user.token,
            upsert=True,      # adds Prefer: resolution=merge-duplicates
        )

    except Exception as e:
        app_logger.error(f"Failed to save health_profiles for user {user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save profile data: {str(e)}")

    return {
        "message": "Profile updated successfully",
        "profile": {
            "first_name": data.first_name,
            "last_name": data.last_name,
            "full_name": full_name,
            "contact_email": data.contact_email,
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
            "aqi_threshold": data.aqi_threshold
        }
    }


@router.get("/doctors")
async def list_doctors(user=Depends(get_current_user)):
    """
    Returns all users with role='doctor'.
    """
    from app.database import supabase_request
    
    try:
        users_resp = await supabase_request(
            "users",
            "GET",
            query_params={"role": "eq.doctor", "select": "id,email,first_name,last_name", "order": "created_at.desc"},
            token=user.token,
            use_cache=True,
        )
        doctors = []
        for u in users_resp or []:
            doctors.append({
                "id": u["id"],
                "email": u.get("email"),
                "full_name": " ".join(filter(None, [u.get("first_name"), u.get("last_name")])).strip() or u.get("email"),
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
        patient_ids = await get_doctor_patient_ids(user)
        if not patient_ids:
            return {"patients": []}

        res = await supabase_request(
            "users", 
            "GET", 
            query_params={"role": "eq.patient", "id": f"in.({','.join(patient_ids)})", "order": "created_at.desc"}, 
            token=user.token,
            use_cache=True
        )
        patients = res or []
        
        try:
            if patients:
                # Extract all unique patient IDs
                patient_ids = [p.get('id') for p in patients if p.get('id')]
                
                # Fetch risk predictions for all patients in one query, assuming the response limit allows it
                # We sort by created_at.desc to get the latest easily when we process the array
                if patient_ids:
                    # In PostgREST, we can use the 'in' filter
                    in_filter = ",".join(patient_ids)
                    pred_res = await supabase_request(
                        "risk_predictions", 
                        "GET", 
                        query_params={
                            "user_id": f"in.({in_filter})", 
                            "select": "user_id,risk_category,final_risk_score,created_at", 
                            "order": "created_at.desc"
                        }, 
                        token=user.token,
                        use_cache=True
                    )
                    
                    if pred_res:
                        # Group by user_id, taking the first (latest) due to the desc order
                        latest_preds = {}
                        for pr in pred_res:
                            uid = pr.get("user_id")
                            if uid and uid not in latest_preds:
                                latest_preds[uid] = pr
                        
                        # Apply to patients array
                        for p in patients:
                            uid = p.get('id')
                            if uid in latest_preds:
                                pred = latest_preds[uid]
                                p['risk_category'] = pred.get("risk_category")
                                p['risk'] = pred.get("risk_category")
                                p['risk_score'] = pred.get("final_risk_score")
                            
        except Exception as inner_e:
            app_logger.warning(f"Failed to fetch aggregated risk data for patients: {inner_e}")

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
        await ensure_doctor_patient_access(user, patient_id)
        # Fetch all patient details concurrently using asyncio.gather
        
        async def fetch_user():
            res = await supabase_request("users", "GET", query_params={"id": f"eq.{patient_id}"}, token=user.token, use_cache=True)
            return res[0] if res else {}
            
        async def fetch_health_profile():
            try:
                res = await supabase_request("health_profiles", "GET", query_params={"user_id": f"eq.{patient_id}", "limit": "1"}, token=user.token)
                return res[0] if res else {}
            except Exception:
                return {}
                
        async def fetch_latest_prediction():
            try:
                res = await supabase_request("risk_predictions", "GET", query_params={"user_id": f"eq.{patient_id}", "order": "created_at.desc", "limit": "1"}, token=user.token)
                return res[0] if res else {}
            except Exception:
                return {}
                
        async def fetch_latest_breath_test():
            try:
                res = await supabase_request("breath_tests", "GET", query_params={"user_id": f"eq.{patient_id}", "order": "created_at.desc", "limit": "1"}, token=user.token)
                return res[0] if res else {}
            except Exception:
                return {}
                
        async def fetch_prediction_trend():
            try:
                res = await supabase_request("risk_predictions", "GET", query_params={"user_id": f"eq.{patient_id}", "select": "final_risk_score,created_at", "order": "created_at.desc", "limit": "6"}, token=user.token)
                return res or []
            except Exception:
                return []

        patient, health_profile, latest_prediction, latest_breath_test, prediction_trend = await asyncio.gather(
            fetch_user(),
            fetch_health_profile(),
            fetch_latest_prediction(),
            fetch_latest_breath_test(),
            fetch_prediction_trend()
        )
        
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


@router.post("/change-password")
async def change_password(req: ChangePasswordRequest, user=Depends(get_current_user)):
    """
    Changes the authenticated user's password via the Supabase Admin API.
    Requires SUPABASE_SERVICE_ROLE_KEY to be set.
    """
    if not is_strong_password(req.new_password):
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters, include a number, and an uppercase letter.")

    if not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=503,
            detail="Password change is not available (service key not configured)."
        )

    try:
        await supabase_admin_auth_request(
            f"users/{user.id}",
            "PUT",
            {"password": req.new_password}
        )
        app_logger.info(f"Password changed for user {user.id}")
        return {"message": "Password updated successfully."}
    except Exception as e:
        app_logger.error(f"Failed to change password for user {user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update password: {str(e)}")


@router.get("/notifications")
async def get_notifications(user=Depends(get_current_user)):
    """
    Returns the user's saved notification preferences from health_profiles.
    Falls back to sensible defaults if no preferences are stored.
    """
    from app.database import supabase_request
    try:
        hp = await supabase_request(
            "health_profiles",
            "GET",
            query_params={"user_id": f"eq.{user.id}", "select": "notification_prefs", "limit": "1"},
            token=user.token,
        )
        prefs = hp[0].get("notification_prefs") if hp else None
        if prefs is None:
            # Default preferences (all on except weekly_summary / medication_reminders)
            prefs = {
                "Health alerts": True,
                "AQI warnings": True,
                "Analysis complete": True,
                "Medication reminders": False,
                "Doctor messages": True,
                "critical_alerts": True,
                "report_reminders": True,
                "new_assignments": True,
                "weekly_summary": False,
            }
        return {"preferences": prefs}
    except Exception as e:
        app_logger.warning(f"Failed to fetch notification prefs for {user.id}: {e}")
        return {"preferences": {}}


@router.put("/notifications")
async def update_notifications(req: NotificationPreferences, user=Depends(get_current_user)):
    """
    Persists the user's notification preferences into health_profiles.notification_prefs (JSONB).
    """
    from app.database import supabase_request
    import json as _json
    try:
        # Use PostgREST UPSERT (ON CONFLICT UPDATE) — reliable on both new and existing rows
        await supabase_request(
            "health_profiles",
            "POST",
            {"user_id": user.id, "notification_prefs": req.preferences},
            token=user.token,
            upsert=True,
        )
        app_logger.info(f"Notification prefs updated for user {user.id}")
        return {"message": "Notification preferences saved.", "preferences": req.preferences}
    except Exception as e:
        app_logger.error(f"Failed to save notification prefs for {user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save preferences: {str(e)}")

