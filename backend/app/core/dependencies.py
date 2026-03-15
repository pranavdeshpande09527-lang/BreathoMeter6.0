from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import supabase_auth_request
from app.utils.logger import app_logger
import types

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Dependency to validate JWT and return the authenticated user as an object.
    Used across all protected routes.
    """
    token = credentials.credentials
    if not token:
        raise HTTPException(status_code=401, detail="Invalid authentication token")

    try:
        user_data = await supabase_auth_request("user", "GET", token=token)
        # return user as object so we can use user.id, user.email etc.
        return types.SimpleNamespace(**user_data, token=token)
    except Exception as e:
        app_logger.error(f"Authentication failure: {str(e)}")
        raise HTTPException(status_code=401, detail="Session expired or invalid")

def get_authenticated_db(user = Depends(get_current_user)):
    """
    Dependency to get a Supabase client authenticated with the current user's JWT.
    This ensures RLS policies are satisfied.
    """
    from app.core.database import Database
    return Database.get_client(token=user.token)

def require_role(allowed_roles: list[str]):
    """
    Dependency to enforce Role-Based Access Control (RBAC).
    Checks the public.users table for the user's role, with JWT metadata fallback.
    """
    async def role_checker(current_user = Depends(get_current_user)):
        user_role = None
        
        # 1. Try to get role from the public.users table using httpx-based request
        try:
            from app.database import supabase_request
            res = await supabase_request(
                "users", 
                "GET", 
                query_params={"id": f"eq.{current_user.id}", "select": "role"}, 
                token=current_user.token
            )
            if res and len(res) > 0:
                user_role = res[0].get("role", "").lower()
        except Exception as e:
            from app.utils.logger import app_logger
            app_logger.warning(f"RBAC: Could not query users table for {current_user.id}: {e}")
        
        # 2. Fallback: extract role from JWT user_metadata
        if not user_role:
            metadata = getattr(current_user, 'user_metadata', {}) or {}
            user_role = metadata.get('role', 'patient').lower()
        
        if user_role not in [role.lower() for role in allowed_roles]:
            from app.utils.logger import app_logger
            app_logger.warning(f"SECURITY: Unauthorized access attempt by {current_user.id} (Role: {user_role}) to resource requiring {allowed_roles}")
            raise HTTPException(status_code=403, detail="Access denied. Insufficient privileges.")
            
        return current_user
    
    return role_checker

async def check_patient_consent(doctor_id: str, patient_id: str) -> bool:
    """
    Validates if a patient has granted consent for a specific doctor to view their PHI.
    In a real system, this queries a 'patient_consents' table. 
    Here we implement a mock boolean check based on the requirement: 'Require patient consent for doctor access (mock boolean or DB schema)'
    """
    # Mocking that patient consent is granted. In production, a DB check happens here.
    from app.utils.logger import app_logger
    app_logger.info(f"SECURITY: Checking consent for doctor {doctor_id} to view patient {patient_id}... Granted.")
    return True

async def log_medical_access(doctor_id: str, patient_id: str, resource_type: str):
    """
    Secure medical data logging to maintain an audit trail of PHI access
    """
    from app.core.database import get_db
    supabase = get_db()
    try:
        supabase.table("audit_logs").insert({
            "actor_id": doctor_id,
            "target_id": patient_id,
            "action": "ACCESS_PHI",
            "resource": resource_type
        }).execute()
        app_logger.info(f"AUDIT: Doctor {doctor_id} accessed {resource_type} for patient {patient_id}")
    except Exception as e:
        # We log the error but don't fail the request if audit logging fails momentarily
        app_logger.error(f"AUDIT LOGGING FAILED: {e}")
