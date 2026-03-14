import asyncio
import os
import sys
from pathlib import Path

# Add backend to sys.path
backend_path = Path(__file__).parent
sys.path.append(str(backend_path))

from app.services.aqi_service import aqi_service

async def verify_service():
    print("Verifying AQIService...")
    
    # Test IP-based
    try:
        print("\nTesting 'here' (IP-based):")
        res = await aqi_service.get_aqi("here")
        print(f"Location: {res['location_name']}")
        print(f"AQI: {res['aqi']}")
        print(f"PM2.5: {res['pm25']}")
    except Exception as e:
        print(f"Error testing 'here': {e}")

    # Test City
    try:
        print("\nTesting 'Mumbai':")
        res = await aqi_service.get_aqi("mumbai")
        print(f"Location: {res['location_name']}")
        print(f"AQI: {res['aqi']}")
    except Exception as e:
        print(f"Error testing city: {e}")

    # Test Geo
    try:
        print("\nTesting 'geo:40.7128;-74.0060' (New York):")
        res = await aqi_service.get_aqi("geo:40.7128;-74.0060")
        print(f"Location: {res['location_name']}")
        print(f"AQI: {res['aqi']}")
        print(f"Pollutants: PM25={res['pm25']}, PM10={res['pm10']}, O3={res['o3']}, NO2={res['no2']}")
    except Exception as e:
        print(f"Error testing geo: {e}")

if __name__ == "__main__":
    asyncio.run(verify_service())
