"""
Email Routes — Breathometer Email Intelligence System
Endpoints:
  POST /email/send-report     — Manual health report email (user-triggered)
  POST /email/danger-alert    — Internal: auto danger alert trigger
"""
import asyncio
import logging
import time
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr

from app.core.dependencies import get_current_user
from app.services.email_generator import generate_danger_email, generate_report_email
from app.services.email_service import send_email
from app.services.aqi_service import aqi_service

router = APIRouter(prefix="/email", tags=["email"])
logger = logging.getLogger(__name__)

# ─── Danger Alert Cooldown ───────────────────────────────────────────────────
# Prevents alert spam: one auto-alert per email per 30-minute danger session.
_danger_cooldown: dict[str, float] = {}
COOLDOWN_SECONDS = 30 * 60  # 30 minutes


def _is_on_cooldown(email: str) -> bool:
    last = _danger_cooldown.get(email)
    if last is None:
        return False
    return (time.time() - last) < COOLDOWN_SECONDS


def _mark_cooldown(email: str):
    _danger_cooldown[email] = time.time()


# ─── Schema ──────────────────────────────────────────────────────────────────

class SendReportRequest(BaseModel):
    """Optional overrides; all data is pulled from live backend state."""
    city: Optional[str] = None         # Override detected city
    lat: Optional[float] = None        # User's latitude
    lon: Optional[float] = None        # User's longitude
    aqi: Optional[int] = None          # Pre-fetched AQI (skip re-fetch if provided)
    risk_score: Optional[float] = None
    fev1: Optional[float] = None
    spo2: Optional[float] = None


# ─── POST /email/send-report ──────────────────────────────────────────────────

@router.post("/send-report")
async def send_health_report(
    req: SendReportRequest,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
):
    """
    User-triggered: generates a personalised AI health report email
    and sends it to the user's contact_email (saved in Settings).
    """
    # ── Resolve recipient email ──────────────────────────────────────────────
    # Priority: contact_email from health_profiles > fallback error
    user_email: str | None = None
    user_name: str = getattr(user, "full_name", None) or getattr(user, "name", None) or "Valued User"

    try:
        from app.database import supabase_request
        hp = await supabase_request(
            "health_profiles",
            "GET",
            query_params={"user_id": f"eq.{user.id}", "select": "contact_email,first_name,last_name", "limit": "1"},
            token=user.token,
        )
        if hp:
            user_email = hp[0].get("contact_email") or None
            first = hp[0].get("first_name", "")
            last = hp[0].get("last_name", "")
            if first or last:
                user_name = f"{first} {last}".strip()
    except Exception as e:
        logger.warning(f"Could not fetch health_profile for email lookup: {e}")

    if not user_email:
        raise HTTPException(
            status_code=400,
            detail="No email address found. Please go to Settings and enter your Gmail address in the 'Notification Email' field, then save your profile."
        )

    # ── Resolve AQI data ──────────────────────────────────────────────────────
    try:
        if req.aqi is not None:
            # Use pre-fetched values passed from frontend
            aqi_value = req.aqi
            city = req.city or "Your Location"
            category = _classify_aqi(aqi_value)
        elif req.lat and req.lon:
            result = await aqi_service.get_aqi(f"geo:{req.lat};{req.lon}")
            aqi_value = result["aqi"]
            city = result.get("location_name", "Your Location")
            category = result.get("pollution_category", _classify_aqi(aqi_value))
        elif req.city:
            result = await aqi_service.get_aqi(req.city)
            aqi_value = result["aqi"]
            city = result.get("location_name", req.city)
            category = result.get("pollution_category", _classify_aqi(aqi_value))
        else:
            # Fallback: use "here" (IP-based, best effort)
            result = await aqi_service.get_aqi("here")
            aqi_value = result["aqi"]
            city = result.get("location_name", "Your Location")
            category = result.get("pollution_category", _classify_aqi(aqi_value))
    except Exception as e:
        logger.warning(f"AQI fetch for report failed ({e}); using defaults.")
        aqi_value = 0
        city = "Unknown"
        category = "Unknown"

    health_metrics = {
        "risk_score": req.risk_score,
        "fev1": req.fev1,
        "spo2": req.spo2,
    }

    # ── Generate & send in background (don't block HTTP response) ─────────────
    background_tasks.add_task(
        _send_report_background,
        user_email, user_name, aqi_value, city, category, health_metrics
    )

    return {
        "success": True,
        "message": f"Your health report is being prepared and will be sent to {user_email} shortly.",
        "email": user_email,
    }


async def _send_report_background(
    email: str, name: str, aqi: int, city: str, category: str, metrics: dict
):
    try:
        html = await generate_report_email(name, aqi, city, category, metrics)
        result = await send_email(
            to=email,
            subject="📊 Your Breathometer Health Report",
            html=html,
        )
        logger.info(f"Health report sent → {email} (msg_id={result.get('id')})")
    except Exception as e:
        logger.error(f"Failed to send health report to {email}: {e}")


# ─── Internal: trigger_danger_alert ──────────────────────────────────────────

async def trigger_danger_alert(user_email: str, user_name: str, aqi_data: dict):
    """
    Called internally when AQI > 150.
    Respects per-email cooldown to avoid spam.
    """
    if not user_email:
        return
    if _is_on_cooldown(user_email):
        logger.info(f"Danger alert suppressed for {user_email} (cooldown active)")
        return

    aqi = aqi_data.get("aqi", 0)
    city = aqi_data.get("location_name", "Your Location")
    category = aqi_data.get("pollution_category", _classify_aqi(aqi))

    try:
        html = await generate_danger_email(user_name, aqi, city, category)
        result = await send_email(
            to=user_email,
            subject="🚨 Air Quality Alert – Immediate Attention Required",
            html=html,
        )
        _mark_cooldown(user_email)
        logger.info(f"Danger alert sent → {user_email} AQI={aqi} (msg_id={result.get('id')})")
    except Exception as e:
        logger.error(f"Failed to send danger alert to {user_email}: {e}")


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _classify_aqi(aqi: int) -> str:
    if aqi <= 50:   return "Good"
    if aqi <= 100:  return "Moderate"
    if aqi <= 150:  return "Unhealthy for Sensitive Groups"
    if aqi <= 200:  return "Unhealthy"
    if aqi <= 300:  return "Very Unhealthy"
    return "Hazardous"
