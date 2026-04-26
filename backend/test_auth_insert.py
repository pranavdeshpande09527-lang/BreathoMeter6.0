import os
import json
import urllib.request
import urllib.error
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("SUPABASE_URL", "")
key = os.environ.get("SUPABASE_KEY", "")

email = "pranavdeshpande@gmail.com"
password = "Pr@131006"

def login():
    try:
        req = urllib.request.Request(
            f"{url}/auth/v1/token?grant_type=password",
            data=json.dumps({"email": email, "password": password}).encode(),
            headers={
                "apikey": key,
                "Content-Type": "application/json"
            },
            method="POST"
        )
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            return data["access_token"], data["user"]["id"]
    except urllib.error.HTTPError as e:
        print(f"Login HTTP {e.code}: {e.read().decode()}")
        return None, None

def patch_profile(token):
    try:
        req = urllib.request.Request(
            "http://127.0.0.1:8000/auth/profile",
            data=json.dumps({
                "first_name": "Test",
                "last_name": "User",
                "phone": "1234567890",
                "date_of_birth": "1990-01-01",
                "blood_group": "O+",
                "known_conditions": "None"
            }).encode(),
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            method="PATCH"
        )
        print("\nPatching profile to create health_profiles row...")
        with urllib.request.urlopen(req) as response:
            print("Profile Patch Success:", response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"Profile Patch HTTP {e.code}: {e.read().decode()}")

def test_insert(table, payload, token):
    try:
        req = urllib.request.Request(
            f"{url}/rest/v1/{table}",
            data=json.dumps(payload).encode(),
            headers={
                "apikey": key,
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            },
            method="POST"
        )
        with urllib.request.urlopen(req) as response:
            res_data = response.read().decode()
            with open("insert_errors.txt", "a") as f:
                f.write(f"\nSuccess {table}: {res_data}\n")
    except urllib.error.HTTPError as e:
        err_data = e.read().decode()
        with open("insert_errors.txt", "a") as f:
            f.write(f"\nHTTP {e.code} for {table}: {err_data}\n")

# Clear the log file first
with open("insert_errors.txt", "w") as f:
    f.write("Starting test...\n")

token, user_id = login()
if token:
    with open("insert_errors.txt", "a") as f:
        f.write(f"Logged in as user: {user_id}\n")
    user_payload = {
        "id": user_id,
        "email": email
    }
    test_insert("users", user_payload, token)
    
    risk_payload = {
        "user_id": user_id, 
        "final_risk_score": 0.5,
        "predicted_condition": "Low Risk",
        "risk_category": "Low Risk",
        "ai_explanation": "Test",
        "top_risk_factors": ["Test 1"]
    }
    test_insert("risk_predictions", risk_payload, token)

    breath_payload = {
        "user_id": user_id,
        "lung_capacity": 3.0,
        "breath_duration": 15.0,
        "breath_strength": 80.0,
        "test_accuracy": 95.0,
        "peak_airflow": 0.0,
        "signal_stability": 0.0,
        "is_valid": True,
        "background_noise_detected": False,
        "cough_detected": False,
        "raw_attempts": []
    }
    test_insert("breath_tests", breath_payload, token)
else:
    with open("insert_errors.txt", "a") as f:
        f.write("Failed to login.\n")
