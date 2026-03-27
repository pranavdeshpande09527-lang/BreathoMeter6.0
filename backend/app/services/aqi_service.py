import httpx
from fastapi import HTTPException
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class AQIService:
    def __init__(self):
        self.aqicn_key = settings.aqicn_api_key
        self.ow_key = settings.openweather_api_key
        self.ow_base_url = "http://api.openweathermap.org/data/2.5"
        self.aqicn_url = "https://api.waqi.info"

    def _get_pollution_category(self, aqi: int) -> str:
        if aqi <= 50: return "Good"
        if aqi <= 100: return "Moderate"
        if aqi <= 150: return "Unhealthy for Sensitive Groups"
        if aqi <= 200: return "Unhealthy"
        if aqi <= 300: return "Very Unhealthy"
        return "Hazardous"

    async def get_aqi(self, location: str) -> dict:
        """Fetch precise AQI data for a specific location using WAQI (AQICN)."""
        try:
            target = "here"
            if location == "here":
                target = "here"
            elif "geo:" in location:
                # Format: geo:lat;lon
                coords = location.replace("geo:", "").split(";")
                target = f"geo:{coords[0]};{coords[1]}"
            else:
                target = location

            # 1. Fetch Real-time AQI from WAQI (AQICN)
            async with httpx.AsyncClient(timeout=10.0) as client:
                aq_url = f"{self.aqicn_url}/feed/{target}/?token={self.aqicn_key}"
                aq_resp = await client.get(aq_url)
                
                if aq_resp.status_code != 200:
                    raise HTTPException(status_code=502, detail="AQI service unreachable")
                
                aq_data = aq_resp.json()
                if aq_data.get("status") != "ok":
                    logger.error(f"WAQI Error: {aq_data.get('data')}")
                    raise HTTPException(status_code=404, detail="City not found in AQI index")

                data = aq_data["data"]
                iaqi = data.get("iaqi", {})
                city = data.get("city", {})
                
                lat, lon = city.get("geo", [0.0, 0.0])
                
                # 2. Fetch Precisely Local Weather from OpenWeather
                weather_url = f"{self.ow_base_url}/weather?lat={lat}&lon={lon}&appid={self.ow_key}&units=metric"
                w_resp = await client.get(weather_url)
                w_data = w_resp.json() if w_resp.status_code == 200 else {}
                
                weather_list = w_data.get("weather", [])
                weather_desc = weather_list[0].get("description") if weather_list else None

                result = {
                    "location_name": city.get("name", location),
                    "latitude": lat,
                    "longitude": lon,
                    "aqi": data.get("aqi"),
                    "pollution_category": self._get_pollution_category(data.get("aqi", 0)),
                    "pm25": iaqi.get("pm25", {}).get("v"),
                    "pm10": iaqi.get("pm10", {}).get("v"),
                    "o3": iaqi.get("o3", {}).get("v"),
                    "no2": iaqi.get("no2", {}).get("v"),
                    "so2": iaqi.get("so2", {}).get("v"),
                    "co": iaqi.get("co", {}).get("v"),
                    "temperature": w_data.get("main", {}).get("temp"),  # type: ignore
                    "humidity": w_data.get("main", {}).get("humidity"),  # type: ignore
                    "wind_speed": w_data.get("wind", {}).get("speed"),  # type: ignore
                    "weather_description": weather_desc,
                    "timestamp": data.get("time", {}).get("s")
                }
                return result

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in AQIService: {e}")
            raise HTTPException(status_code=503, detail="AQI service unavailable")

aqi_service = AQIService()

