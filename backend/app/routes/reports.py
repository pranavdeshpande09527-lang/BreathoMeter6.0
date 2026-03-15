from fastapi import APIRouter, Depends
from app.services.report_service import report_service
from app.core.dependencies import get_current_user, get_authenticated_db

router = APIRouter(prefix="/reports", tags=["Health Reports"])

@router.get("/summary")
async def get_report_summary(user = Depends(get_current_user)):
    """
    Returns a JSON summary report combining all user metrics.
    """
    report = await report_service.generate_json_report(user.id)
    return report


@router.get("/doctor")
async def get_doctor_reports(user = Depends(get_current_user)):
    """
    Returns recent risk predictions across all patients for the doctor reports page.
    Doctor RLS policies grant access to all patient data.
    """
    from app.database import supabase_request
    
    try:
        res = await supabase_request(
            "risk_predictions", 
            "GET", 
            query_params={
                "select": "id,user_id,risk_category,predicted_condition,final_risk_score,ai_explanation,created_at",
                "order": "created_at.desc",
                "limit": "20"
            }, 
            token=user.token
        )
        
        reports = []
        for pred in (res or []):
            # Lookup patient email for display
            patient_email = ""
            try:
                u_res = await supabase_request(
                    "users", 
                    "GET", 
                    query_params={"id": f"eq.{pred.get('user_id', '')}", "select": "email", "limit": "1"}, 
                    token=user.token
                )
                if u_res:
                    patient_email = u_res[0].get("email", "")
            except Exception:
                pass
            
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
                "status": "Reviewed" if risk == "Low" else "Pending Review",
                "ai_explanation": pred.get("ai_explanation", "")
            })
        
        return reports
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error fetching doctor reports: {e}")
        return []

