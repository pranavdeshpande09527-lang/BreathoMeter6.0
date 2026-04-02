import asyncio
import httpx

async def test_full_pipeline():
    login_data = {"username": "pranav", "password": "Pr@131006"}
    async with httpx.AsyncClient() as client:
        res = await client.post("http://localhost:8000/auth/login", data=login_data)
        if res.status_code != 200:
            print(f"Login failed: {res.text}")
            return
        token = res.json().get("access_token")
        print("Logged in")

        headers = {"Authorization": f"Bearer {token}"}
        
        # Call inference API first
        inference_payload = {
            "environmental_data": {
                "AQI": 150.0, "PM10": 100.0, "PM2_5": 75.0, "NO2": 45.0, "SO2": 25.0,
                "O3": 60.0, "Temperature": 30.0, "Humidity": 65.0, "WindSpeed": 10.0,
                "RespiratoryCases": 15.0, "CardiovascularCases": 5.0, "HospitalAdmissions": 2.0,
                "HealthImpactScore": 80.0
            },
            "optional_patient_data": {
                "age": 45,
                "gender": "Male",
                "symptoms": ["wheezing", "shortness of breath", "chest tightness"],
                "medical_history": ["Asthma"],
                "lifestyle": {
                    "smoking_habits": "Current smoker",
                    "outdoor_time_hours": 4
                }
            }
        }
        res_inference = await client.post("http://localhost:8000/inference/predict", json=inference_payload, headers=headers)
        print("Inference result:", res_inference.status_code)
        
        if res_inference.status_code != 200:
            print(res_inference.text)
            return
            
        inference_data = res_inference.json()
        
        # Merge exactly like frontend
        final_payload = {
            "final_risk_score": 85.0,
            "risk_category": "Very High Risk",
            "top_risk_factors": ["Smoking", "Age"],
            "ai_explanation": "Test",
            **inference_data
        }
        
        print(f"Calling /prediction/store with payload keys: {list(final_payload.keys())}")
        
        res_store = await client.post("http://localhost:8000/prediction/store", json=final_payload, headers=headers)
        print("Store result:", res_store.status_code)
        print(res_store.text)

asyncio.run(test_full_pipeline())
