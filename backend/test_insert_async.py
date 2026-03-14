import asyncio
import os
import sys
from dotenv import load_dotenv # type: ignore

# ensure app can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

from app.database import supabase_request

async def test_prediction():
    payload = {
        "user_id": "00000000-0000-0000-0000-000000000000", 
        "final_risk_score": 0.5,
        "predicted_condition": "Low Risk",
        "risk_category": "Low Risk",
        "ai_explanation": "Test",
        "top_risk_factors": ["Test 1"]
    }
    try:
        print("\nTesting risk_predictions insert...")
        res = await supabase_request("risk_predictions", "POST", data=payload)
        print("Success:", res)
    except Exception as e:
        print("Error:", str(e))

async def test_breath():
    payload = {
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
    try:
        print("\nTesting breath_tests insert...")
        res = await supabase_request("breath_tests", "POST", data=payload)
        print("Success:", res)
    except Exception as e:
        print("Error:", str(e))

if __name__ == "__main__":
    asyncio.run(test_prediction())
    asyncio.run(test_breath())
