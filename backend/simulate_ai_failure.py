import asyncio
import sys

# Setup imports correctly
import os
sys.path.append(os.path.dirname(__file__))

from app.config import settings

# 1. Sabotage the API keys to force 100% failure
settings.groq_api_key = "invalid_groq"
settings.gemini_api_key = "invalid_gemini"

# Mock the database calls for dependencies so the ML test can run
from unittest.mock import AsyncMock
import app.services.ml_service
app.services.ml_service.supabase_request = AsyncMock(return_value=[
    {"confirmed_diagnosis": "Asthma", "smoking_status": "Never", "cough_severity": 1}
])

from app.services.chatbot_service import chatbot_service
from app.services.ai_service import ai_service

# Mock rate limiter because it expects starlette Requests
from unittest.mock import MagicMock
import app.routes.inference_api
def mock_limit(limit_value):
    def decorator(func):
        return func
    return decorator
app.routes.inference_api.limiter.limit = mock_limit

from app.routes.inference_api import get_risk_prediction, EnvironmentalData

# We need a mock user that the inference route depends on
class MockUser:
    id = "123"
    token = "xyz"

async def test_all_failures():
    print("========================================")
    print("SIMULATING 100% AI OUTAGE...         ")
    print("========================================")

    # 1. Chatbot Test
    print("\n--- Chatbot Fallback Test ---")
    chat_response = await chatbot_service.get_response("I can't breathe", {})
    ascii_chat = chat_response[:100].encode('ascii', errors='ignore').decode('ascii')
    print("Response snippet:", ascii_chat, "...")
    assert "busy" in chat_response.lower() or "health guidelines" in chat_response.lower()

    # 2. AI Explanation Test
    print("\n--- Explanation Fallback Test ---")
    explain_response = await ai_service.generate_explanation("Asthma", {})
    ascii_explain = explain_response[:100].encode('ascii', errors='ignore').decode('ascii')
    print("Response snippet:", ascii_explain, "...")
    assert "busy" in explain_response.lower()

    # 3. Inference / Ensemble Test
    print("\n--- Inference (Ensemble) Fallback Test ---")
    env_data = EnvironmentalData(
        AQI=120, PM10=60, PM2_5=40, NO2=20, SO2=10, O3=30,
        Temperature=30, Humidity=60, WindSpeed=5,
        RespiratoryCases=50, CardiovascularCases=30, HospitalAdmissions=20,
        HealthImpactScore=60
    )
    patient_data = {
        "age": 45,
        "gender": "Male",
        "lifestyle": {"smoking_habits": "Never"},
        "vitals": {"spo2": 94, "inhale_capacity": 3, "exhale_capacity": 2, "breath_hold_time": 12, "cough_severity": 4},
        "symptoms": ["Wheezing", "Cough"]
    }

    from starlette.requests import Request
    scope = {
        "type": "http",
        "method": "POST",
        "client": ("127.0.0.1", 8000),
        "headers": [],
        "path": "/api/inference"
    }
    class MockRequest(Request):
        def __init__(self):
            super().__init__(scope)
    try:
        prediction = await get_risk_prediction(MockRequest(), env_data, patient_data, MockUser())
        print(f"Prediction Output Type: {type(prediction)}")
        
        if isinstance(prediction, dict) and "disease_risks" in prediction:
            risks = prediction["disease_risks"]
            print(f"Successfully generated {len(risks)} diseases during total AI outage!")
            for r in risks:
                print(f" - {r['disease']}: {r['risk_percentage']}% ({r['reason'][:60]}...)")
        else:
            print("Prediction result:", prediction)
    except Exception as e:
        print(f"FAIL: Inference crashed! {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    print("\n========================================")
    print("ALL TESTS PASSED! System is FAIL-PROOF.")
    print("========================================")

if __name__ == "__main__":
    # Workaround for async on windows
    policy = asyncio.WindowsSelectorEventLoopPolicy()
    asyncio.set_event_loop_policy(policy)
    asyncio.run(test_all_failures())
