import httpx
import asyncio
import os

TOKEN = "replace_with_actual_token" # I'll need to get this from the app
BASE_URL = "http://localhost:8000"

async def test_minimal():
    # 1. Login to get token
    async with httpx.AsyncClient() as client:
        login_res = await client.post(f"{BASE_URL}/auth/login", data={"username": "pranav", "password": "Pr@131006"})
        if login_res.status_code != 200:
            print(f"Login failed: {login_res.text}")
            return
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Try minimal storage
        payload = {
            "final_risk_score": 0.5,
            "risk_category": "Moderate",
            "ai_explanation": "Test",
            "top_risk_factors": ["Test Factor"]
        }
        
        print(f"Sending minimal payload: {payload}")
        res = await client.post(f"{BASE_URL}/prediction/store", json=payload, headers=headers)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text}")

if __name__ == "__main__":
    asyncio.run(test_minimal())
