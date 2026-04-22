import httpx
import asyncio

async def test_geo():
    api_key = "ae721b8430bdfe29c10edcfb94fcfcf8"
    lat, lon = 19.0760, 72.8777 # Mumbai
    
    # Test /weather
    url_w = f"http://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric"
    async with httpx.AsyncClient() as client:
        resp_w = await client.get(url_w)
        print(f"Weather Resp ({resp_w.status_code}): {resp_w.json().get('name')}")

    # Test /geo/1.0/reverse
    url_g = f"http://api.openweathermap.org/geo/1.0/reverse?lat={lat}&lon={lon}&limit=1&appid={api_key}"
    async with httpx.AsyncClient() as client:
        resp_g = await client.get(url_g)
        if resp_g.status_code == 200:
            data = resp_g.json()
            if data:
                print(f"Geo Name: {data[0].get('name')}")
            else:
                print("Geo Name: No results")
        else:
            print(f"Geo Error: {resp_g.status_code} {resp_g.text}")

if __name__ == "__main__":
    asyncio.run(test_geo())
