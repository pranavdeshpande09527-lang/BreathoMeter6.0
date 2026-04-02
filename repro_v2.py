import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def get_token():
    url = f"{BASE_URL}/auth/login"
    payload = {"username": "pranav", "password": "Pr@131006"}
    response = requests.post(url, json=payload)
    if response.status_code == 200:
        return response.json().get("session", {}).get("access_token")
    return None

def test_repro():
    token = get_token()
    if not token:
        print("Login failed")
        return

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # 1. Call actual inference API
    inf_url = f"{BASE_URL}/inference/predict"
    inf_payload = {
        "environmental_data": {
            "AQI": 75, "PM10": 40, "PM2_5": 25, "NO2": 20, "SO2": 10, "O3": 35,
            "Temperature": 22, "Humidity": 65, "WindSpeed": 12,
            "RespiratoryCases": 12, "CardiovascularCases": 8,
            "HospitalAdmissions": 3, "HealthImpactScore": 45
        },
        "optional_patient_data": {
            "age": 45, 
            "gender": "Male", 
            "symptoms": ["Wheezing", "Chest Tightness", "Shortness of Breath"],
            "vitals": {"spo2": 92, "breath_hold_time": 25, "cough_severity": 3},
            "lifestyle": {"smoking_habits": "Current Smoker", "occupation": "Construction"}
        }
    }
    
    print("Calling Inference API...")
    inf_resp = requests.post(inf_url, json=inf_payload, headers=headers)
    print(f"Inference Status: {inf_resp.status_code}")
    if inf_resp.status_code != 200:
        print(inf_resp.json())
        return
    
    inference_result = inf_resp.json()
    print(f"Predicted Disease Risks: {len(inference_result.get('disease_risks', []))}")
    for d in inference_result.get('disease_risks', []):
        print(f" - {d['disease']}: {d['risk_percentage']}%")

    # 2. Construct final payload for storage
    finalPredictionPayload = {
        "environmental_data": inf_payload["environmental_data"],
        "patient_data": inf_payload["optional_patient_data"],
        "vitals": inf_payload["optional_patient_data"].get("vitals", {})
    }
    # Direct mappings for predicted values
    finalPredictionPayload.update(inference_result)
    
    # Ensure mandatory fields match the schema names if different
    if "final_risk_score" in inference_result and "risk_score" not in finalPredictionPayload:
        finalPredictionPayload["risk_score"] = inference_result["final_risk_score"]
    if "confidence_score" in inference_result and "confidence" not in finalPredictionPayload:
        finalPredictionPayload["confidence"] = inference_result["confidence_score"]
    if "primary_prediction" in inference_result and "prediction_result" not in finalPredictionPayload:
        finalPredictionPayload["prediction_result"] = inference_result["primary_prediction"]

    print("\nAttempting to store prediction...")
    store_url = f"{BASE_URL}/prediction/store"
    response = requests.post(store_url, json=finalPredictionPayload, headers=headers)
    
    print(f"Storage Status: {response.status_code}")
    if response.status_code != 200:
        print(f"Error Body: {json.dumps(response.json(), indent=2)}")
    else:
        print("Successfully stored prediction!")
        print(f"Prediction ID: {response.json().get('prediction_id')}")

if __name__ == "__main__":
    test_repro()
