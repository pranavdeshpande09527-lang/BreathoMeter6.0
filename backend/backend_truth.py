"""
Breathometer Backend Inference Ground Truth
Direct API calls to verify clinical logic.
"""
import requests
import json

BASE_URL = "https://breathometer6-0.onrender.com/inference/predict"

# 1. Extreme Profile
EXTREME_REQ = {
    "environmental_data": {
        "AQI": 180, "PM10": 90, "PM2_5": 120, "NO2": 50, "SO2": 20, "O3": 40,
        "Temperature": 32, "Humidity": 75, "WindSpeed": 5,
        "RespiratoryCases": 100, "CardiovascularCases": 50, "HospitalAdmissions": 20,
        "HealthImpactScore": 85
    },
    "optional_patient_data": {
        "age": 72,
        "gender": "Male",
        "lifestyle": {"smoking_habits": "Active smoker, 1 pack/day"},
        "vitals": {
            "spo2": 88,
            "inhale_capacity": 1.2,
            "exhale_capacity": 1.1,
            "breath_hold_time": 8,
            "stairs_difficulty": "Severe breathlessness"
        },
        "symptoms": ["Chronic cough", "Persistent wheezing", "Chest pain"]
    }
}

# 2. Moderate Profile
MODERATE_REQ = {
    "environmental_data": {
        "AQI": 45, "PM10": 20, "PM2_5": 15, "NO2": 10, "SO2": 5, "O3": 15,
        "Temperature": 22, "Humidity": 45, "WindSpeed": 12,
        "RespiratoryCases": 10, "CardiovascularCases": 5, "HospitalAdmissions": 2,
        "HealthImpactScore": 15
    },
    "optional_patient_data": {
        "age": 28,
        "gender": "Female",
        "lifestyle": {"smoking_habits": "Never"},
        "vitals": {
            "spo2": 99,
            "inhale_capacity": 5.5,
            "exhale_capacity": 4.5,
            "breath_hold_time": 45,
            "stairs_difficulty": "Never"
        },
        "symptoms": []
    }
}

def check_risk(name, payload):
    print(f"--- CHECKING {name} ---")
    try:
        # Note: We need a user token usually, but I'll try without or see if I can find a token.
        # Actually, let's see if the API is public or requires Bearer token.
        # From code: user = Depends(get_current_user)
        # So I need a token. I'll create a user first.
        r = requests.post(BASE_URL, json=payload) # This might return 401
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            print(json.dumps(r.json(), indent=2))
        else:
            print(f"Error: {r.text}")
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    # check_risk("EXTREME", EXTREME_REQ)
    # check_risk("MODERATE", MODERATE_REQ)
    print("Code ready for execution once token is handled.")
