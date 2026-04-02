import asyncio
import httpx

async def test_store():
    # Login to get a token
    login_data = {
        "email": "pranav",
        "password": "Pr@131006"
    }
    async with httpx.AsyncClient() as client:
        # The backend might be running, let's login
        res = await client.post("http://localhost:8000/auth/login", json=login_data)
        if res.status_code != 200:
            print(f"Login failed: {res.text}")
            return
        token = res.json().get("access_token")

        # Now test /prediction/store
        payload = {
            "final_risk_score": 85.5,
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
        headers = {"Authorization": f"Bearer {token}"}
        res2 = await client.post("http://localhost:8000/prediction/store", json=payload, headers=headers)
        print(f"Store status: {res2.status_code}")
        print(f"Store response: {res2.text}")

        # Check logs if we get 500, by making a direct supabase request to see the actual error
        if res2.status_code == 500:
            print("To get details, we might need to look at DB directly.")

asyncio.run(test_store())
