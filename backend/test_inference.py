import requests
import json

url = "http://127.0.0.1:8000/inference/predict"
payload = {
    "environmental_data": {
        "AQI": 150,
        "PM10": 80,
        "PM2_5": 50,
        "NO2": 30,
        "SO2": 10,
        "O3": 40,
        "Temperature": 30,
        "Humidity": 60,
        "WindSpeed": 2,
        "RespiratoryCases": 10,
        "CardiovascularCases": 5,
        "HospitalAdmissions": 3,
        "HealthImpactScore": 75
    },
    "optional_patient_data": {
        "age": 45,
        "gender": "Male",
        "symptoms": "Chronic cough for 2 weeks, shortness of breath on exertion, wheezing at night",
        "medical_history": "Childhood asthma",
        "lifestyle": {
            "smoking_habits": "Current",
            "outdoor_time_hours": 4
        }
    }
}

try:
    response = requests.post(url, json=payload)
    print(f"Status: {response.status_code}")
    print("Response JSON:")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
