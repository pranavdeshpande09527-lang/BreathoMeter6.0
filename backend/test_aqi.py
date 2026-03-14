import httpx
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def test_aqi():
    api_key = os.getenv("AQICN_API_KEY")
    if not api_key:
        print("AQICN_API_KEY not found in .env")
        return

    # Test IP-based AQI (here)
    url_here = f"https://api.waqi.info/feed/here/?token={api_key}"
    # Test Lat/Lon AQI (e.g., New York)
    lat, lon = 40.7128, -74.0060
    url_geo = f"https://api.waqi.info/feed/geo:{lat};{lon}/?token={api_key}"

    async with httpx.AsyncClient() as client:
        print(f"Testing IP-based AQI: {url_here}")
        resp_here = await client.get(url_here)
        print(f"Status: {resp_here.status_code}")
        if resp_here.status_code == 200:
            data = resp_here.json()
            print(f"Response Status: {data.get('status')}")
            if data.get('status') == 'ok':
                print(f"AQI: {data['data']['aqi']}")
                print(f"Location: {data['data']['city']['name']}")
            else:
                print(f"Data: {data.get('data')}")

        print(f"\nTesting Geo-based AQI: {url_geo}")
        resp_geo = await client.get(url_geo)
        print(f"Status: {resp_geo.status_code}")
        if resp_geo.status_code == 200:
            data = resp_geo.json()
            print(f"Response Status: {data.get('status')}")
            if data.get('status') == 'ok':
                print(f"AQI: {data['data']['aqi']}")
                print(f"Location: {data['data']['city']['name']}")
            else:
                print(f"Data: {data.get('data')}")

if __name__ == "__main__":
    asyncio.run(test_aqi())
