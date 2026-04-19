"""
Breathometer Clinical Logic Validator
Performs direct API validation for extreme and moderate profiles.
"""
import requests
import json
import uuid

BASE_API = "https://breathometer6-0.onrender.com"

def get_token(username):
    # Try logging in first if exists
    login_url = f"{BASE_API}/auth/login"
    login_payload = {"username": username, "password": "Password123!"}
    r = requests.post(login_url, json=login_payload)
    if r.status_code == 200:
        return r.json()["session"]["access_token"]
    
    # Otherwise signup
    signup_url = f"{BASE_API}/auth/signup"
    signup_payload = {
        "username": username,
        "password": "Password123!",
        "full_name": "Validator User",
        "role": "patient",
        "age": 30
    }
    r = requests.post(signup_url, json=signup_payload)
    if r.status_code == 200:
        return r.json()["session"]["access_token"]
    return None

def run_analysis():
    uname = f"val_{uuid.uuid4().hex[:6]}"
    token = get_token(uname)
    if not token:
        print("Failed to get token.")
        return

    headers = {"Authorization": f"Bearer {token}"}
    
    profiles = {
        "EXTREME": {
            "environmental_data": {"AQI": 250, "PM10": 150, "PM2_5": 200, "NO2": 80, "SO2": 40, "O3": 60, "Temperature": 35, "Humidity": 80, "WindSpeed": 2, "RespiratoryCases": 200, "CardiovascularCases": 100, "HospitalAdmissions": 50, "HealthImpactScore": 95},
            "optional_patient_data": {"age": 75, "lifestyle": {"smoking_habits": "Active smoker"}, "vitals": {"spo2": 85, "inhale_capacity": 0.8, "exhale_capacity": 0.7, "breath_hold_time": 5, "stairs_difficulty": "Severe breathlessness"}, "symptoms": ["Chronic cough", "Shortness of breath", "Wheezing"]}
        },
        "MODERATE": {
            "environmental_data": {"AQI": 40, "PM10": 15, "PM2_5": 10, "NO2": 5, "SO2": 2, "O3": 10, "Temperature": 20, "Humidity": 40, "WindSpeed": 15, "RespiratoryCases": 5, "CardiovascularCases": 2, "HospitalAdmissions": 1, "HealthImpactScore": 10},
            "optional_patient_data": {"age": 25, "lifestyle": {"smoking_habits": "Never"}, "vitals": {"spo2": 99, "inhale_capacity": 6.0, "exhale_capacity": 5.0, "breath_hold_time": 50, "stairs_difficulty": "Never"}, "symptoms": []}
        }
    }

    results = {}
    for name, payload in profiles.items():
        print(f"Analyzing {name}...")
        r = requests.post(f"{BASE_API}/inference/predict", json=payload, headers=headers)
        if r.status_code == 200:
            results[name] = r.json()
            print(f"Risk Category: {results[name]['risk_category']}")
            print(f"Final Score: {results[name]['final_risk_score']}")
        else:
            print(f"Error {name}: {r.text}")

    with open("clinical_validation_results.json", "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    run_analysis()
