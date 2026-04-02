import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

async def test_store():
    # Use service role key to insert to the database and see the schema issue
    payload = {
        # Using a dummy UUID for user_id to simulate foreign key constraint if needed
        "user_id": "b3e64841-8656-4b10-a292-6f296d997232",  
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
    
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    url = f"{SUPABASE_URL}/rest/v1/risk_predictions"
    print("Testing direct insert to rest/v1/risk_predictions")
    async with httpx.AsyncClient() as client:
        res = await client.post(url, json=payload, headers=headers)
        print(f"Status Code: {res.status_code}")
        print(f"Response: {res.text}")

        # Let's also check the schema of risk_predictions using an OPTIONS or GET request
        print("\nChecking schema via GET with limit 1")
        res2 = await client.get(f"{url}?limit=1", headers=headers)
        if res2.status_code == 200:
            print("Current data format:")
            print(res2.text)

asyncio.run(test_store())
