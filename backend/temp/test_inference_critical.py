import asyncio
import httpx
import json

async def main():
    base_url = "http://127.0.0.1:8000"
    async with httpx.AsyncClient(timeout=30) as client:
        # 1. Login
        resp = await client.post(f"{base_url}/auth/login", json={"username": "pranav", "password": "Pr@131006"})
        data = resp.json()
        token = data.get("session", {}).get("access_token")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Call inference/predict with extremely critical inputs
        payload = {
            "environmental_data": {
                "AQI": 350.0,
                "PM10": 200.0,
                "PM2_5": 150.0,
                "NO2": 50.0,
                "SO2": 25.0,
                "O3": 45.0,
                "Temperature": 25.0,
                "Humidity": 60.0,
                "WindSpeed": 10.0,
                "RespiratoryCases": 100,
                "CardiovascularCases": 50,
                "HospitalAdmissions": 30,
                "HealthImpactScore": 90
            },
            "optional_patient_data": {
                "age": 65,
                "gender": "Male",
                "vitals": {
                    "spo2": 85,
                    "breath_hold_time": 10
                },
                "lifestyle": {
                    "smoking_habits": "Heavy Smoker",
                    "occupation": "Factory Worker"
                },
                "symptoms": ["chronic cough", "shortness of breath", "chest pain", "wheezing"],
                "medical_history": ["hypertension", "copd"]
            }
        }
        
        print("Calling /inference/predict...")
        inf_resp = await client.post(f"{base_url}/inference/predict", json=payload, headers=headers)
        print(f"Status: {inf_resp.status_code}")
        
        if inf_resp.status_code == 200:
            res = inf_resp.json()
            with open("inf_test_out.json", "w") as f:
                json.dump(res, f, indent=2)
            print("disease_risks:")
            for d in res.get("disease_risks", []):
                print(d)
        else:
            print("Error:", inf_resp.text)

if __name__ == "__main__":
    asyncio.run(main())
