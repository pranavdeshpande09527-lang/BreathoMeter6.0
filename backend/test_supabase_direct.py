import os
import urllib.request
import urllib.error
import json
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("SUPABASE_URL", "")
key = os.environ.get("SUPABASE_KEY", "")

def test_insert(table, payload):
    try:
        req = urllib.request.Request(
            f"{url}/rest/v1/{table}",
            data=json.dumps(payload).encode(),
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            },
            method="POST"
        )
        print(f"Testing {table} insert...")
        with urllib.request.urlopen(req) as response:
            print("Success:", response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()}")
    except Exception as e:
        print(f"Error: {e}")

# Test risk_predictions
risk_payload = {
    "user_id": "00000000-0000-0000-0000-000000000000", # Need a valid UUID
    "final_risk_score": 0.5,
    "predicted_condition": "Low Risk",
    "risk_category": "Low Risk",
    "ai_explanation": "Test",
    "top_risk_factors": ["Test 1"]
}
test_insert("risk_predictions", risk_payload)

# Test breath_tests
breath_payload = {
    "user_id": "00000000-0000-0000-0000-000000000000",
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
test_insert("breath_tests", breath_payload)
