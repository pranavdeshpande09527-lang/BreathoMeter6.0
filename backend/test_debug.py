import asyncio
from httpx import AsyncClient
from app.main import app

async def main():
    try:
        async with AsyncClient(app=app, base_url="http://test") as ac:
            resp = await ac.post("/auth/signup", json={
                "username": "pranav_test99",
                "password": "Password123!",
                "full_name": "Test User",
                "role": "patient"
            })
            print(resp.status_code)
            print(resp.json())
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(main())
