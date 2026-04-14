from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from app.database import supabase_request
from app.core.dependencies import get_current_user
import httpx
import logging
from app.config import settings
from app.core.rate_limit import limiter
from app.core.security import sanitize_free_text

from app.services.aqi_service import aqi_service

router = APIRouter(prefix="/environment", tags=["environment"])
logger = logging.getLogger(__name__)


class EnvironmentRequest(BaseModel):
    pm25: float
    pm10: float
    aqi: float
    location: Optional[str] = Field(None, max_length=120)
    model_config = ConfigDict(extra="forbid")


@router.post("")
@limiter.limit("30/minute")
async def store_environment_data(request: Request, data: EnvironmentRequest, background_tasks: BackgroundTasks, user = Depends(get_current_user)):
    try:
        res = await supabase_request("environment_data", "POST", data={
            "user_id": user.id,
            "pm25": data.pm25,
            "pm10": data.pm10,
            "aqi": data.aqi,
            "location": sanitize_free_text(data.location, max_length=120, field_name="location") if data.location else None
        }, token=user.token)

        # ── Auto danger alert ──────────────────────────────────────────────
        target_email = getattr(user, "email", None)
        aqi_threshold = 100
        try:
            hp_res = await supabase_request(
                "health_profiles", 
                "GET", 
                query_params={"user_id": f"eq.{user.id}", "select": "aqi_threshold,contact_email", "limit": "1"}, 
                token=user.token
            )
            if hp_res and len(hp_res) > 0:
                if hp_res[0].get("aqi_threshold") is not None:
                    aqi_threshold = int(hp_res[0].get("aqi_threshold"))
                if hp_res[0].get("contact_email"):
                    target_email = hp_res[0].get("contact_email")
        except Exception as hp_err:
            logger.warning(f"Failed to fetch health profile for AQI threshold check: {hp_err}")

        if data.aqi > aqi_threshold:
            try:
                from app.routes.email import trigger_danger_alert
                user_name = getattr(user, "full_name", None) or getattr(user, "name", None) or "Valued User"
                if target_email:
                    aqi_data = {
                        "aqi": int(data.aqi),
                        "location_name": data.location or "Your Location",
                        "pollution_category": _classify_aqi(int(data.aqi)),
                    }
                    background_tasks.add_task(trigger_danger_alert, target_email, user_name, aqi_data, aqi_threshold)
            except Exception as alert_err:
                logger.warning(f"Could not schedule danger alert: {alert_err}")

        return {"message": "Environment data saved", "data": res}
    except Exception as e:
        logger.error(f"Error saving environment data: {e}")
        raise HTTPException(status_code=500, detail="Failed to store environment data")


@router.get("/aqi")
async def get_aqi(lat: float = 0.0, lon: float = 0.0, location: str = ""):
    """Fetch real AQI for a lat/lon coordinate or location via AQIService."""
    try:
        if location:
            return await aqi_service.get_aqi(location)
        if lat == 0.0 and lon == 0.0:
            return await aqi_service.get_aqi("here")
        return await aqi_service.get_aqi(f"geo:{lat};{lon}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching AQI: {e}")
        raise HTTPException(status_code=503, detail="AQI service unavailable")


@router.get("/aqi-by-city")
async def get_aqi_by_city(city: str):
    """Fetch real AQI for a city name via AQIService."""
    if not city or len(city.strip()) < 2:
        raise HTTPException(status_code=400, detail="City name must be at least 2 characters")
    try:
        return await aqi_service.get_aqi(city.strip())
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching AQI by city '{city}': {e}")
        raise HTTPException(status_code=503, detail="AQI service unavailable")


@router.get("/weather")
async def get_weather(lat: float = 0.0, lon: float = 0.0, location: str = ""):
    """Fetch real weather data for a lat/lon coordinate or city via OpenWeatherMap."""
    try:
        if location:
            url = f"https://api.openweathermap.org/data/2.5/weather?q={location}&appid={settings.openweather_api_key}&units=metric"
        else:
            url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={settings.openweather_api_key}&units=metric"
            
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            data = response.json()

            if response.status_code == 200:
                return {
                    "temperature": data["main"]["temp"],
                    "feels_like": data["main"].get("feels_like"),
                    "humidity": data["main"].get("humidity"),
                    "description": data["weather"][0]["description"],
                    "wind_speed": data.get("wind", {}).get("speed")
                }

            logger.error(f"OpenWeather returned non-200: {response.status_code} - {data}")
            raise HTTPException(status_code=503, detail="Weather service returned invalid response")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching weather: {e}")
        raise HTTPException(status_code=503, detail="Weather service unavailable")


# ── Helper ────────────────────────────────────────────────────────────────────

def _classify_aqi(aqi: int) -> str:
    if aqi <= 50:   return "Good"
    if aqi <= 100:  return "Moderate"
    if aqi <= 150:  return "Unhealthy for Sensitive Groups"
    if aqi <= 200:  return "Unhealthy"
    if aqi <= 300:  return "Very Unhealthy"
    return "Hazardous"
