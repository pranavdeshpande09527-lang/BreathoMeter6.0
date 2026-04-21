from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List
from datetime import datetime, timedelta
from app.core.dependencies import get_current_user, require_role
from app.core.security import get_doctor_patient_ids
from app.database import supabase_request
from app.services.email_service import send_email
from app.services.push_service import push_service

router = APIRouter(prefix="/alerts", tags=["alerts"])
import logging
logger = logging.getLogger(__name__)

@router.get("/{user_id}")
async def get_user_alerts(user_id: str, background_tasks: BackgroundTasks, current_user = Depends(get_current_user)):
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

    # Decision Logic based on CPCB categories and Personalized Load
    SEVERITY_RANK = {
        "good": 1, "satisfactory": 2, "moderate": 3,
        "poor": 4, "very poor": 5, "severe": 6
    }
    
    def get_cpcb_category(v):
        if v <= 50: return "good"
        if v <= 100: return "satisfactory"
        if v <= 200: return "moderate"
        if v <= 300: return "poor"
        if v <= 400: return "very poor"
        return "severe"

    # 1. Dynamic AQI & Health Risk Alert (Smart Alerts)
    try:
        # A. Fetch Profile and Health Data
        profile_res = await supabase_request("health_profiles", "GET", query_params={"user_id": f"eq.{user_id}"}, token=current_user.token)
        health_res = await supabase_request("health_data", "GET", query_params={"user_id": f"eq.{user_id}", "order": "created_at.desc", "limit": "1"}, token=current_user.token)
        env_res = await supabase_request("environment_data", "GET", query_params={"user_id": f"eq.{user_id}", "order": "recorded_at.desc", "limit": "7"}, token=current_user.token)

        if env_res:
            latest_env = env_res[0]
            aqi = latest_env.get("aqi", 0)
            dominant_pollutant = latest_env.get("dominant_pollutant") or "PM2.5"
            category = get_cpcb_category(aqi)
            
            # --- Base Sensitivity Calculation ---
            base_sensitivity = 1.0
            conditions = ""
            if profile_res:
                p = profile_res[0]
                conditions = (p.get("known_conditions") or "").lower()
                if any(k in conditions for k in ["asthma", "copd", "bronchitis", "respiratory"]):
                    base_sensitivity += 0.5
                if p.get("smoking_status") == "Current":
                    base_sensitivity += 0.2
                if (p.get("age") or 0) > 60 or (p.get("age") or 30) < 12:
                    base_sensitivity += 0.3
            
            # --- Exposure Duration Factor ---
            outdoor_hours = 2.0 # Default if unknown
            if health_res:
                outdoor_hours = float(health_res[0].get("outdoor_hours") or 2.0)
            
            # Normalize duration: 4 hours is standard baseline for 'prolonged'
            duration_factor = max(0.5, outdoor_hours / 4.0)
            
            # --- Frequency Factor (Last 7 days) ---
            poor_days = len([e for e in env_res if e.get("aqi", 0) > 200])
            frequency_factor = 1.0 + (poor_days * 0.1)

            # --- Final Dynamic Risk Score ---
            risk_score = aqi * base_sensitivity * duration_factor * frequency_factor
            
            # Prepare Alert Details
            severity = "high" if (aqi > 200 or risk_score > 300) else ("moderate" if (aqi > 100 or risk_score > 200) else "low")
            alert_hash = f"{category}|{dominant_pollutant}|{severity}"
            
            if aqi > 200 or risk_score > 300:
                reason = "Severe AQI detected." if aqi > 400 else (f"Critical risk due to prolonged exposure ({outdoor_hours}h) with respiratory sensitivity." if risk_score > 400 else "High risk detected.")
                title = "CRITICAL: Respiratory Protection Required"
                desc = f"AQI is {aqi} ({category.replace('_', ' ').title()}). {reason} Avoid all outdoor physical activity."
                add_alert("high", title, desc)
                
                # --- Cooldown & Intelligent Trigger Logic ---
                should_send_email = False
                
                # Fetch last alert history for cooldown check
                history_res = await supabase_request(
                    "alert_history", "GET", 
                    query_params={"user_id": f"eq.{user_id}", "alert_type": "eq.email_critical", "order": "sent_at.desc", "limit": "1"},
                    token=current_user.token
                )

                if not history_res:
                    should_send_email = True
                else:
                    last = history_res[0]
                    last_sent_at = datetime.fromisoformat(last["sent_at"].replace("Z", "+00:00"))
                    time_diff = datetime.now(last_sent_at.tzinfo) - last_sent_at
                    
                    # Adaptive Cooldown Windows
                    cooldown_hours = 1 if category == "severe" else 4
                    
                    # Override: Severity Increased
                    if SEVERITY_RANK.get(category, 0) > SEVERITY_RANK.get(last.get("severity"), 0):
                        should_send_email = True
                    # Override: Risk Score increased significantly (>15%)
                    elif risk_score > (float(last.get("risk_score") or 0) * 1.15):
                        should_send_email = True
                    # Override: Signature changed
                    elif alert_hash != last.get("alert_hash"):
                        should_send_email = True
                    # Standard Cooldown
                    elif time_diff > timedelta(hours=cooldown_hours):
                        should_send_email = True

                if should_send_email:
                    # 1. Trigger Email Alert
                    email_subject = f"⚠️ CRITICAL HEALTH ALERT: {title}"
                    email_html = f"""
                    <div style='font-family: sans-serif; padding: 20px; border: 2px solid #e11d48; border-radius: 10px;'>
                        <h2 style='color: #e11d48;'>Breathometer: Critical Health Warning</h2>
                        <p>Hello,</p>
                        <p>Our dynamic risk engine has detected a <strong>Critical Risk Level</strong> for your respiratory health.</p>
                        <div style='background: #fff1f2; padding: 15px; border-radius: 5px; margin: 20px 0;'>
                            <p><strong>AQI:</strong> {aqi} ({category.title()})</p>
                            <p><strong>Dominant Pollutant:</strong> {dominant_pollutant}</p>
                            <p><strong>Reason:</strong> {reason}</p>
                            <p><strong>Recommendation:</strong> {desc}</p>
                        </div>
                        <p>Please stay indoors and monitor your breathing. Consider using an air purifier if available.</p>
                    </div>
                    """
                    background_tasks.add_task(send_email, to=current_user.email, subject=email_subject, html=email_html)

                    # 2. Trigger Push Notification
                    async def trigger_push():
                        try:
                            # Fetch user tokens
                            tokens_res = await supabase_request(
                                "push_tokens", "GET", 
                                query_params={"user_id": f"eq.{user_id}"},
                                token=current_user.token
                            )
                            if tokens_res:
                                tokens = [t["token"] for t in tokens_res]
                                result = push_service.send_push_notification(
                                    tokens=tokens,
                                    title=title,
                                    body=desc,
                                    data={
                                        "type": "health_alert",
                                        "severity": severity,
                                        "aqi": str(aqi),
                                        "pollutant": dominant_pollutant
                                    }
                                )
                                # Clean up invalid tokens
                                if result.get("invalid_tokens"):
                                    from app.database import supabase_admin_request
                                    for inv_token in result["invalid_tokens"]:
                                        await supabase_admin_request(
                                            "push_tokens", "DELETE",
                                            params={"user_id": f"eq.{user_id}", "token": f"eq.{inv_token}"}
                                        )
                        except Exception as e:
                            logger.error(f"Error in push notification background task: {e}")

                    background_tasks.add_task(trigger_push)
                    
                    # 3. Record in History
                    # Use admin request to ensure recording even if user RLS is tricky (though we fixed RLS)
                    from app.database import supabase_admin_request
                    background_tasks.add_task(
                        supabase_admin_request,
                        "alert_history", "POST",
                        data={
                            "user_id": user_id,
                            "alert_type": "email_critical",
                            "severity": category,
                            "aqi": aqi,
                            "dominant_pollutant": dominant_pollutant,
                            "risk_score": risk_score,
                            "alert_hash": alert_hash
                        }
                    )
            
            elif aqi > 300 or risk_score > 400:
                add_alert("high", "High Health Risk Alert", f"AQI is {aqi} (Very Poor). Personalized risk detected. Potential for respiratory distress. Stay indoors.")
            elif aqi > 200 or risk_score > 300:
                add_alert("high", "AQI Alert — Poor Air Quality", f"AQI is {aqi}. Elevated risk for individuals with {conditions or 'sensitive profiles'}. Limit outdoor exertion.")
            elif aqi > 100 or risk_score > 200:
                add_alert("moderate", "Moderate Health Caution", f"AQI is {aqi} (Satisfactory/Moderate). Prolonged outdoor exposure may cause minor discomfort for you today.")
            elif aqi > 50:
                add_alert("low", "Ambient Air Quality: Satisfactory", f"AQI is {aqi}. Good for most activities, but stay aware of changes.")

    except Exception as e:
        logger.error(f"Error checking Dynamic AQI alerts: {e}", exc_info=True)

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
