import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

async def test_store():
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    
    url = f"{SUPABASE_URL}/rest/v1/risk_predictions"

    async with httpx.AsyncClient() as client:
        # Get an existing user_id
        res2 = await client.get(f"{url}?limit=1", headers=headers)
        if res2.status_code == 200 and len(res2.json()) > 0:
            existing_user_id = res2.json()[0]["user_id"]
            print("Found user_id:", existing_user_id)
        else:
            print("No existing user_id found")
            return

        payload = {
            "user_id": existing_user_id,
            "final_risk_score": 85.5,
            "predicted_condition": "Very High Risk",
            "risk_category": "Very High Risk",
            "ai_explanation": "Test explanation",
            "top_risk_factors": ["Smoking", "Age"],
            "disease_risks": [
                {"disease": "Asthma", "risk_percentage": 90, "reason": "Test reason"}
            ],
            "ml_score": 88.0,
            "ai_score": 85.0,
            "agreement_score": 95.0,
            "confidence_score": 90.0,
            "confidence_tier": "high",
            "primary_prediction": "Asthma",
            "recommended_specialty": "Pulmonologist"
        }
        
        headers["Prefer"] = "return=representation"
        res = await client.post(url, json=payload, headers=headers)
        print(f"Status Code: {res.status_code}")
        print(f"Response: {res.text}")

asyncio.run(test_store())
