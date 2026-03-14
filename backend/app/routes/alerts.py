from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime, timedelta
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_authenticated_db, require_role

router = APIRouter(prefix="/alerts", tags=["alerts"])
import logging
logger = logging.getLogger(__name__)

@router.get("/{user_id}")
async def get_user_alerts(user_id: str, current_user = Depends(get_current_user), supabase = Depends(get_authenticated_db)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view these alerts")
        
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
        env_res = supabase.table("environment_data").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
        if env_res.data:
            latest_env = env_res.data[0]
            if latest_env.get("aqi", 0) > 100:
                add_alert("high", "AQI Alert — Dangerous Levels", f"AQI in your area is {latest_env['aqi']} (Unhealthy). Minimize outdoor activity and keep windows closed.")
            elif latest_env.get("aqi", 0) > 50:
                add_alert("moderate", "AQI Alert — Moderate Risk", f"AQI is {latest_env['aqi']}. Unusually sensitive individuals should consider limiting prolonged outdoor exertion.")
    except Exception as e:
        logger.error(f"Error checking AQI alerts: {e}")

    # 2. High Risk Model Prediction Alert
    try:
        pred_res = supabase.table("risk_predictions").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
        if pred_res.data:
            latest_pred = pred_res.data[0]
            if latest_pred.get("risk_level", "").lower() == "high":
                add_alert("high", "Critical AI Risk Assessment", f"The AI engine detected a high risk for {latest_pred.get('predicted_condition', 'respiratory issues')}. Please consult a doctor immediately.")
            elif latest_pred.get("risk_level", "").lower() == "moderate" or latest_pred.get("risk_level", "").lower() == "elevated":
                add_alert("moderate", "Elevated Risk Detected", f"Your latest analysis shows elevated risk patterns. Consider taking a preventative inhaler dose if prescribed.")
    except Exception as e:
        logger.error(f"Error checking prediction alerts: {e}")

    # 3. Performance Drop Alert
    try:
        seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
        test_res = supabase.table("breath_tests").select("*").eq("user_id", user_id).gte("created_at", seven_days_ago).order("created_at", desc=False).execute()
        
        if test_res.data and len(test_res.data) >= 2:
            tests = test_res.data
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
async def get_doctor_alerts(doctor_id: str, current_user = Depends(require_role(["doctor"])), supabase = Depends(get_authenticated_db)):
    """Aggregate high priority alerts across all patients for the doctor dashboard"""
    if current_user.id != doctor_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    alerts = []
    alert_id = 1
    
    # Ideally, we would fetch only patients assigned to this doctor.
    # For now, we fetch a few recent high-risk predictions across the platform.
    try:
        pred_res = supabase.table("risk_predictions").select("user_id, risk_level, predicted_condition, created_at").eq("risk_level", "High").order("created_at", desc=True).limit(5).execute()
        if pred_res.data:
            for pred in pred_res.data:
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
