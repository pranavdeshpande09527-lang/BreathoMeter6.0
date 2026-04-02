import asyncio
import httpx
import json

async def main():
    base_url = "http://127.0.0.1:8000"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{base_url}/auth/login", json={"username": "pranav", "password": "Pr@131006"})
        token = resp.json().get("session", {}).get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        payload = {
            "environmental_data": { "AQI": 150.0, "PM10": 80.0, "PM2_5": 55.0, "NO2": 40.0, "SO2": 20.0, "O3": 50.0, "Temperature": 28.0, "Humidity": 65.0, "WindSpeed": 10.0, "RespiratoryCases": 15.0, "CardiovascularCases": 10.0, "HospitalAdmissions": 5.0, "HealthImpactScore": 85.0 },
            "optional_patient_data": { "age": 45, "gender": "Male", "symptoms": "Cough (severity 5, 10 days), Breathlessness (severity 5), Chest Pain (severity 4)", "medical_history": "Asthma, Hypertension", "lifestyle": { "smoking_habits": "Current", "outdoor_time_hours": 4 } }
        }
        
        pred_resp = await client.post(f"{base_url}/inference/predict", json=payload, headers=headers)
        data = pred_resp.json()
        with open("val_output.json", "w") as f:
            json.dump(data, f, indent=2)

if __name__ == "__main__":
    asyncio.run(main())
