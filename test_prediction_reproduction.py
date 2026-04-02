import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_login():
    url = f"{BASE_URL}/auth/login"
    payload = {
        "username": "pranav",
        "password": "Pr@131006"
    }
    response = requests.post(url, json=payload)
    print(f"Login Response: {response.status_code}")
    if response.status_code == 200:
        return response.json().get("session", {}).get("access_token")
    else:
        print(response.json())
        return None

def test_prediction_store(token):
    print("Testing Prediction Store...")
    url = f"{BASE_URL}/prediction/store"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Payload with MISSING ml_score
    payload = {
        "final_risk_score": 0.45,
        "risk_category": "Low Risk",
        "ai_explanation": "Test explanation",
        "top_risk_factors": ["Symptom Reports", "Clinical Data"],
        "ai_score": 0.45,
        "agreement_score": 0.9,
        "confidence_score": 0.9,
        "disease_risks": []
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        print(f"Store Response Status: {response.status_code}")
        print(f"Store Response Body: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Store Request failed: {e}")

if __name__ == "__main__":
    token = test_login()
    if token:
        test_prediction_store(token)
    else:
        print("Login failed, skipping store test.")
