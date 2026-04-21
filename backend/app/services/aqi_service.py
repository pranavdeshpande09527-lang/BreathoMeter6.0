import httpx
from fastapi import HTTPException
from app.config import settings
from app.utils.cpcb_aqi import calculate_cpcb_aqi
import logging

logger = logging.getLogger(__name__)

class AQIService:
    def __init__(self):
        self.aqicn_key = settings.aqicn_api_key
        self.ow_key = settings.openweather_api_key
        self.ow_base_url = "http://api.openweathermap.org/data/2.5"
        self.aqicn_url = "https://api.waqi.info"

    def _get_cpcb_category(self, aqi: int) -> str:
        """Categorize AQI according to CPCB Indian Standards."""
        if aqi <= 50: return "Good"
        if aqi <= 100: return "Satisfactory"
        if aqi <= 200: return "Moderate"
        if aqi <= 300: return "Poor"
        if aqi <= 400: return "Very Poor"
        return "Severe"

    async def get_aqi(self, location: str) -> dict:
        """
        Fetch precise AQI data using OpenWeatherMap for raw concentrations 
        and CPCB deterministic logic for final calculation.
        """
        try:
            if "geo:" in location:
                # Format: geo:lat;lon
                coords = location.replace("geo:", "").split(";")
                lat, lon = float(coords[0]), float(coords[1])
                location_name = f"Lat: {lat}, Lon: {lon}"
            else:
                # Use WAQI to resolve city name or "here" to coordinates
                async with httpx.AsyncClient(timeout=10.0) as client:
                    aq_url = f"{self.aqicn_url}/feed/{location}/?token={self.aqicn_key}"
                    aq_resp = await client.get(aq_url)
                    
                    if aq_resp.status_code != 200:
                        raise HTTPException(status_code=502, detail="Geocoding service unreachable")
                    
                    aq_data = aq_resp.json()
                    if aq_data.get("status") != "ok":
                        logger.error(f"WAQI Location Error: {aq_data.get('data')}")
                        raise HTTPException(status_code=404, detail="Location not found")

                    data = aq_data["data"]
                    city_info = data.get("city", {})
                    lat, lon = city_info.get("geo", [0.0, 0.0])
                    location_name = city_info.get("name", location)

            # now we have lat, lon. Fetch raw pollution data from OpenWeather
            async with httpx.AsyncClient(timeout=10.0) as client:
                # 1. Fetch Air Pollution Data
                pollution_url = f"{self.ow_base_url}/air_pollution?lat={lat}&lon={lon}&appid={self.ow_key}"
                p_resp = await client.get(pollution_url)
                
                if p_resp.status_code != 200:
                    logger.error(f"OpenWeather Pollution API Error: {p_resp.text}")
                    raise HTTPException(status_code=502, detail="Pollution data service unreachable")
                
                p_data = p_resp.json()
                if not p_data.get("list"):
                    raise HTTPException(status_code=404, detail="Pollution data not available for this coordinate")

                components = p_data["list"][0]["components"]
                
                # 2. Convert units and map to CPCB inputs
                # OpenWeather provides all in µg/m3. 
                # CPCB needs CO in mg/m3. 
                raw_pollutants = {
                    "pm25": components.get("pm2_5"),
                    "pm10": components.get("pm10"),
                    "no2": components.get("no2"),
                    "so2": components.get("so2"),
                    "co": components.get("co", 0) / 1000.0 if components.get("co") is not None else None, # µg/m3 -> mg/m3
                    "o3": components.get("o3")
                }

                # 3. Calculate CPCB AQI Deterministically
                cpcb_result = calculate_cpcb_aqi(raw_pollutants)

                # 4. Fetch Weather for context
                weather_url = f"{self.ow_base_url}/weather?lat={lat}&lon={lon}&appid={self.ow_key}&units=metric"
                w_resp = await client.get(weather_url)
                w_data = w_resp.json() if w_resp.status_code == 200 else {}
                
                weather_list = w_data.get("weather", [])
                weather_desc = weather_list[0].get("description") if weather_list else None

                result = {
                    "location_name": location_name,
                    "latitude": lat,
                    "longitude": lon,
                    "aqi": cpcb_result["aqi"],
                    "pollution_category": self._get_cpcb_category(cpcb_result["aqi"]),
                    "dominant_pollutant": cpcb_result["dominant_pollutant"],
                    "sub_indices": cpcb_result["sub_indices"],
                    "pm25": raw_pollutants["pm25"],
                    "pm10": raw_pollutants["pm10"],
                    "o3": raw_pollutants["o3"],
                    "no2": raw_pollutants["no2"],
                    "so2": raw_pollutants["so2"],
                    "co": raw_pollutants["co"],
                    "temperature": w_data.get("main", {}).get("temp"), 
                    "humidity": w_data.get("main", {}).get("humidity"), 
                    "wind_speed": w_data.get("wind", {}).get("speed"),
                    "weather_description": weather_desc,
                    "timestamp": p_data["list"][0].get("dt")
                }
                return result

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in AQIService: {e}")
            raise HTTPException(status_code=503, detail="AQI calculation engine error")

aqi_service = AQIService()
