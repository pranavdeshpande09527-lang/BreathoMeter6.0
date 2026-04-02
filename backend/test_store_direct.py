import asyncio
from app.database import supabase_request
from app.core.database import get_db

async def test_store():
    # Login to get a token
    import httpx
    login_data = {"username": "pranav", "password": "Pr@131006"}
    async with httpx.AsyncClient() as client:
        res = await client.post("http://localhost:8000/auth/login", data=login_data)
        if res.status_code != 200:
            print(f"Login failed: {res.text}")
            return
        token = res.json().get("access_token")
        user_id = res.json()["user"]["id"]

        print("Token and user ID retrieved:", user_id)

    try:
        payload = {
            "user_id": user_id,
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
        print("Sending to Supabase...")
        res = await supabase_request("risk_predictions", "POST", data=payload, token=token)
        print("SUCCESS:", res)
    except Exception as e:
        print("EXCEPTION:", str(e))

asyncio.run(test_store())
