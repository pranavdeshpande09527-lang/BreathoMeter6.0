from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime, timedelta
from app.core.dependencies import get_current_user, require_role
from app.core.security import get_doctor_patient_ids
from app.database import supabase_request

router = APIRouter(prefix="/alerts", tags=["alerts"])
import logging
logger = logging.getLogger(__name__)

@router.get("/{user_id}")
async def get_user_alerts(user_id: str, current_user = Depends(get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view these alerts")
        
    from app.database import supabase_request
    alerts = []
    alert_id = 1
    
    def add_alert(severity, title, description):
        nonlocal alert_id
        alerts.append({
            "id": alert_id,
            "severity": severity,
            "title": title,
            "description": description,
            "time": datetime.now().strftime("%B %d, %Y — %I:%M %p")
        })
        alert_id += 1

    # 1. AQI Dangerous Alert
    try:
        res = await supabase_request(
            "environment_data", 
            "GET", 
            query_params={"user_id": f"eq.{user_id}", "order": "created_at.desc", "limit": "1"}, 
            token=current_user.token
        )
        if res:
            latest_env = res[0]
            if latest_env.get("aqi", 0) > 100:
                add_alert("high", "AQI Alert — Dangerous Levels", f"AQI in your area is {latest_env['aqi']} (Unhealthy). Minimize outdoor activity and keep windows closed.")
            elif latest_env.get("aqi", 0) > 50:
                add_alert("moderate", "AQI Alert — Moderate Risk", f"AQI is {latest_env['aqi']}. Unusually sensitive individuals should consider limiting prolonged outdoor exertion.")
    except Exception as e:
        logger.error(f"Error checking AQI alerts: {e}")

    # 2. High Risk Model Prediction Alert
    try:
        res = await supabase_request(
            "risk_predictions", 
            "GET", 
            query_params={"user_id": f"eq.{user_id}", "order": "created_at.desc", "limit": "1"}, 
            token=current_user.token
        )
        if res:
            latest_pred = res[0]
            risk_lvl = latest_pred.get("risk_level", "").lower()
            if risk_lvl == "high":
                add_alert("high", "Critical AI Risk Assessment", f"The AI engine detected a high risk for {latest_pred.get('predicted_condition', 'respiratory issues')}. Please consult a doctor immediately.")
            elif risk_lvl in ["moderate", "elevated"]:
                add_alert("moderate", "Elevated Risk Detected", f"Your latest analysis shows elevated risk patterns. Consider taking a preventative inhaler dose if prescribed.")
    except Exception as e:
        logger.error(f"Error checking prediction alerts: {e}")

    # 3. Performance Drop Alert
    try:
        seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
        res = await supabase_request(
            "breath_tests", 
            "GET", 
            query_params={"user_id": f"eq.{user_id}", "created_at": f"gte.{seven_days_ago}", "order": "created_at.asc"}, 
            token=current_user.token
        )
        
        if res and len(res) >= 2:
            tests = res
            latest_test = tests[-1]
            previous_tests = tests[:-1]
            
            avg_accuracy = sum((t.get("test_accuracy") or 80) for t in previous_tests) / len(previous_tests)
            latest_accuracy = latest_test.get("test_accuracy") or 80
            
            if latest_accuracy < (avg_accuracy - 15):
                add_alert("high", "Significant Lung Performance Drop", f"Your latest breath test score ({latest_accuracy}%) dropped by over 15% compared to your weekly average ({round(avg_accuracy)}%).")
            elif latest_accuracy < (avg_accuracy - 5):
                add_alert("moderate", "Slight Performance Decline", f"Your breathing performance is slightly below your weekly average. Stay hydrated and rest.")
    except Exception as e:
        logger.error(f"Error checking performance alerts: {e}")
        
    # If no critical alerts, add an informational one
    if not alerts:
        add_alert("low", "All Clear", "Your respiratory health metrics and local air quality are currently stable.")
        add_alert("low", "Daily Reminder", "Remember to take your prescribed controller medication tonight.")

    return alerts

@router.get("/doctor/{doctor_id}")
async def get_doctor_alerts(doctor_id: str, current_user = Depends(require_role(["doctor"]))):
    """Aggregate high priority alerts across all patients for the doctor dashboard"""
    if current_user.id != doctor_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    from app.database import supabase_request
    alerts = []
    alert_id = 1
    
    # Fetch recent high-risk predictions across the platform (doctor RLS allows this)
    try:
        patient_ids = await get_doctor_patient_ids(current_user)
        if not patient_ids:
            return [{
                "id": alert_id,
                "severity": "low",
                "title": "All Clear",
                "description": "No critical alerts across your patient panel.",
                "time": datetime.now().strftime("%B %d, %Y â€” %I:%M %p")
            }]

        in_filter = ",".join(patient_ids)
        res = await supabase_request(
            "risk_predictions", 
            "GET", 
            query_params={"user_id": f"in.({in_filter})", "risk_level": "eq.High", "order": "created_at.desc", "limit": "5"}, 
            token=current_user.token
        )
        if res:
            for pred in res:
                alerts.append({
                    "id": alert_id,
                    "severity": "high",
                    "title": f"Critical AI Risk Detection",
                    "description": f"Patient ({pred['user_id'][:8]}...) showed High Risk for {pred['predicted_condition']}. Immediate clinical review required.",
                    "time": datetime.now().strftime("%B %d, %Y — %I:%M %p")
                })
                alert_id += 1
    except Exception as e:
        logger.error(f"Error fetching doctor alerts: {e}")
        
    if not alerts:
        alerts.append({
            "id": alert_id,
            "severity": "low",
            "title": "All Clear",
            "description": "No critical alerts across your patient panel.",
            "time": datetime.now().strftime("%B %d, %Y — %I:%M %p")
        })

    return alerts
