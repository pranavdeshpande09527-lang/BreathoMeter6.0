from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user
import httpx
import logging
from app.config import settings

from app.services.aqi_service import aqi_service

router = APIRouter(prefix="/environment", tags=["environment"])
logger = logging.getLogger(__name__)


class EnvironmentRequest(BaseModel):
    pm25: float
    pm10: float
    aqi: float
    location: Optional[str] = None


@router.post("")
async def store_environment_data(data: EnvironmentRequest, user = Depends(get_current_user)):
    supabase = get_db()
    try:
        res = supabase.table("environment_data").insert({
            "user_id": user.id,
            "pm25": data.pm25,
            "pm10": data.pm10,
            "aqi": data.aqi,
            "location": data.location
        }).execute()
        return {"message": "Environment data saved", "data": res.data}
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
