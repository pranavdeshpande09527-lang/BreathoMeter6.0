import asyncio
import httpx
from pydantic import BaseModel

async def main():
    base_url = "http://127.0.0.1:8000"
    
    # 1. Login
    async with httpx.AsyncClient() as client:
        # According to api.auth.login: { "username": "pranav", "password": "..." }
        print("Logging in...")
        resp = await client.post(f"{base_url}/auth/login", json={
            "username": "pranav",
            "password": "Pr@131006"
        })
        print(f"Login status: {resp.status_code}")
        if resp.status_code != 200:
            print("Login failed:", resp.text)
            return
            
        data = resp.json()
        token = data.get("session", {}).get("access_token")
        user = data.get("session", {}).get("user", {})
        print(f"Got token! User ID: {user.get('id')}")

        # 2. Store prediction
        headers = {"Authorization": f"Bearer {token}"}
        payload = {
            "final_risk_score": 0.8,
            "risk_category": "High Risk",
            "ai_explanation": "Test explanation",
            "top_risk_factors": ["Smoking History"],
            "disease_risks": [
                {"disease": "COPD", "risk_percentage": 85.0, "reason": "Smoker"}
            ]
        }
        
        print("\nStoring prediction...")
        pred_resp = await client.post(f"{base_url}/prediction/store", json=payload, headers=headers)
        print(f"Prediction store status: {pred_resp.status_code}")
        print("Response:", pred_resp.text)

if __name__ == "__main__":
    asyncio.run(main())
