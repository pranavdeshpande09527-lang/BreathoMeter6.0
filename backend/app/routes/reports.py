from fastapi import APIRouter, Depends, HTTPException
from app.services.report_service import report_service
from app.core.dependencies import get_current_user, require_role
from app.core.security import ensure_doctor_report_access, get_doctor_patient_ids

router = APIRouter(prefix="/reports", tags=["Health Reports"])

@router.get("/summary")
async def get_report_summary(user = Depends(get_current_user)):
    """
    Returns a JSON summary report combining all user metrics.
    """
    report = await report_service.generate_json_report(user.id, user.token)
    return report


@router.get("/doctor")
async def get_doctor_reports(user = Depends(require_role(["doctor"]))):
    """
    Returns recent risk predictions across all patients for the doctor reports page.
    Uses PostgREST joins to fetch patient emails in a single request for performance.
    """
    from app.database import supabase_request
    
    try:
        patient_ids = await get_doctor_patient_ids(user)
        if not patient_ids:
            return []

        in_filter = ",".join(patient_ids)
        # Optimized: Single query with join to fetch patient email via patient_info (users table)
        res = await supabase_request(
            "risk_predictions", 
            "GET", 
            query_params={
                "user_id": f"in.({in_filter})",
                "select": "*,patient_info:users!user_id(email)", 
                "order": "created_at.desc",
                "limit": "20"
            }, 
            token=user.token
        )
        
        reports = []
        for pred in (res or []):
            # Extract email from joined patient_info object/list
            p_data = pred.get("patient_info")
            patient_email = ""
            if isinstance(p_data, list) and len(p_data) > 0:
                patient_email = p_data[0].get("email", "")
            elif isinstance(p_data, dict):
                patient_email = p_data.get("email", "")
            
            risk = pred.get("risk_category", "Unknown")
            score = pred.get("final_risk_score", 0)
            
            reports.append({
                "id": pred.get("id", ""),
                "patient": patient_email.split("@")[0] if patient_email else pred.get("user_id", "")[:8],
                "patient_email": patient_email,
                "patient_id": pred.get("user_id", ""),
                "type": f"Risk Assessment — {pred.get('predicted_condition', 'Respiratory')}",
                "risk": risk if risk in ['High', 'Moderate', 'Low'] else 'Unknown',
                "score": round(score) if score else 0,
                "date": pred.get("created_at", ""),
                "status": pred.get("status", "Pending Review"),
                "ai_explanation": pred.get("ai_explanation", "")
            })
        
        return reports
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error fetching doctor reports: {e}")
        return []

@router.post("/verify/{report_id}")
async def verify_report(report_id: str, user = Depends(require_role(["doctor"]))):
    """
    Signs and verifies a patient report. Only doctors allowed.
    Uses admin request to ensure clinical sign-off status can be updated in DB.
    """
    from app.database import supabase_request
    from datetime import datetime
    
    try:
        await ensure_doctor_report_access(user, report_id)
        await supabase_request(
            "risk_predictions",
            "PATCH",
            query_params={"id": f"eq.{report_id}"},
            data={
                "status": "Reviewed",
                "verified_at": datetime.utcnow().isoformat(),
                "verified_by_id": user.id
            },
            token=user.token,
        )
        return {"success": True, "message": "Report verified successfully."}
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error verifying report: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify report clinical status.")
