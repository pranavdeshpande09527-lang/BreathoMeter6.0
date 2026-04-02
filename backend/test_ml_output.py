import asyncio
import httpx
import json

BASE_URL = "http://localhost:8000"

async def test_prediction():
    print("Loging in...")
    async with httpx.AsyncClient() as client:
        # Login
        login_res = await client.post(f"{BASE_URL}/auth/login", json={
            "username": "integrationtest",
            "password": "TestPass1234!"
        })
        token = login_res.json()["session"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Post health input
        await client.post(f"{BASE_URL}/health/input", json={
            "age": 45, "height": 175.0, "weight": 70.0,
            "smoking_history": True, "activity_level": "Low",
            "respiratory_symptoms": "Coughing"
        }, headers=headers)
        
        # Post breath test (with low capacity to force an interesting result)
        await client.post(f"{BASE_URL}/breath/test", json={
            "durations": [5.2, 4.5, 6.1], "attempt_count": 3
        }, headers=headers)
        
        # Get ML Prediction
        print("\nRequesting Risk Prediction...")
        pred_res = await client.post(f"{BASE_URL}/prediction/predict-risk", headers=headers)
        data = pred_res.json()
        print("\n--- PREDICTION RESULT ---")
        print(json.dumps(data, indent=2))
        
        # Request AI Explanation
        print("\nRequesting AI Explanation...")
        expl_res = await client.post(f"{BASE_URL}/ai/explanation", json={
            "topic": "lung_health_score",
            "user_context": data
        }, headers=headers)
        print("\n--- AI EXPLANATION ---")
        print(json.dumps(expl_res.json(), indent=2))

if __name__ == "__main__":
    asyncio.run(test_prediction())
