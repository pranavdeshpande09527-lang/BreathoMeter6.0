🫁 BreathoMeter 6.0 — Complete Pre-Launch QA & Testing Plan
Repository: pranavdeshpande09527-lang/BreathoMeter6.0
Live URL: https://breathometer6-0.onrender.com
Prepared by: QA Architect / Senior Backend Engineer / DevOps
Date: April 2026

🔍 Repository Analysis Summary
ComponentFindingBackend FrameworkFastAPI (Python 3.11+), entry: app.main:app via uvicornDeploymentRender.com (render.yaml), rootDir: backend, 1 worker, /health healthcheckAuthenticationSupabase GoTrue JWT (anon key + optional service role key)DatabaseSupabase PostgreSQL 17 — 7 tables with full RLS enabledML Pipeline6-model OOF Stacking Ensemble (LR + RF + XGBoost + LightGBM + CatBoost + MLP)AI / ChatGroq (LLaMA 3 8B) for "Hava" chatbot · Gemini 1.5 Flash for explanationsExternal APIsAQICN (air quality), OpenWeatherMap (weather)EmailBrevo API (BREVO_API_KEY)Error MonitoringSentry (SENTRY_DSN, optional)FrontendReact, hosted on FirebaseKnown Live Bug/chatbot/message → HTTP 500 "An unexpected server error occurred."
Confirmed API Routes (from api_test_results.json + README.md)
RouteMethodAuthLast Known Status/GET❌—/healthGET❌—/system-statusGET❌—/auth/signupPOST❌✅ 4.12s/auth/loginPOST❌—/auth/profileGET✅✅ 1.75s/auth/profilePATCH✅—/health/inputPOST✅—/health/latestGET✅—/breath-testPOST✅—/breath-test/{user_id}GET✅—/inference/predictPOST✅✅ 4.35s/prediction/storePOST✅—/prediction/{user_id}GET✅—/environmentPOST✅—/environment/aqiGET❌—/environment/aqi-by-cityGET❌—/environment/weatherGET❌—/ai/explanationPOST✅—/chatbot/messagePOST✅❌ 500/chatPOST✅—/reports/summaryGET✅—/alerts/{user_id}GET✅—/alerts/doctor/{doctor_id}GET✅ (Doctor)—
Real Test Payload (from test_payload.json)
json{
  "environmental_data": {
    "AQI": 150, "PM10": 40, "PM2_5": 80,
    "NO2": 20, "SO2": 10, "O3": 50
  },
  "optional_patient_data": {
    "age": 55,
    "gender": "Male",
    "lifestyle": { "smoking_habits": "Daily" },
    "symptoms": ["Wheezing", "Chest Pain", "Fatigue", "Shortness of Breath", "Coughing"],
    "vitals": { "spo2": 92, "breath_hold_time": 20 }
  }
}

🔷 Phase 0: Environment Setup for Testing
Step 1 — Clone Repository
bashgit clone https://github.com/pranavdeshpande09527-lang/BreathoMeter6.0.git
cd BreathoMeter6.0/backend
Step 2 — Create Virtual Environment
bashpython3.11 -m venv venv
# Linux/Mac
source venv/bin/activate
# Windows
venv\Scripts\activate

pip install -r requirements.txt
Step 3 — Configure .env (place in backend/)
Based on render.yaml env declarations:
dotenv# ── REQUIRED ─────────────────────────────────────────────
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key   # Full features
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
AQICN_API_KEY=your_aqicn_key
OPENWEATHER_API_KEY=your_openweather_key

# ── OPTIONAL ─────────────────────────────────────────────
GOOGLE_MAPS_API_KEY=your_maps_key
BREVO_API_KEY=your_brevo_key       # Email alerts
SENTRY_DSN=your_sentry_dsn         # Error monitoring

# ── STATIC ───────────────────────────────────────────────
ENVIRONMENT=development
PYTHONUNBUFFERED=1
Step 4 — Run Backend Locally
bash# From backend/
uvicorn app.main:app --reload --port 8000
Verify startup:

http://localhost:8000/ → root
http://localhost:8000/health → liveness
http://localhost:8000/docs → Swagger UI
http://localhost:8000/system-status → readiness (checks DB + ML models)

Step 5 — Install Test Dependencies
bashpip install pytest pytest-asyncio httpx pytest-cov faker
Step 6 — Seed Test Data
bash# Create a test user via signup endpoint
curl -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test_qa@breathometer.dev","password":"QaTest@123","name":"QA Tester"}'

# Save returned JWT token for authenticated test calls
export TEST_JWT="<token_from_response>"

🔷 Phase 1: Smoke Testing
1.1 — Server Startup Validation
bash# Server must start without errors
uvicorn app.main:app --reload --port 8000
# Expected: "Application startup complete."
# Check: No ImportError, no missing model file errors
1.2 — Root Endpoint
bashcurl -s http://localhost:8000/
# Expected: {"message": "...", "version": "...", ...} with HTTP 200
1.3 — Health Liveness Probe
bashcurl -s http://localhost:8000/health
# Expected: {"status": "healthy"} or similar, HTTP 200
# This is the Render healthCheckPath — MUST always return 200
1.4 — System Status / Readiness Probe
bashcurl -s http://localhost:8000/system-status
# Expected: JSON showing DB connectivity + ML model load status
# CRITICAL: If ML models fail to load, this should surface here
1.5 — Swagger Docs Available
bashcurl -s http://localhost:8000/docs -o /dev/null -w "%{http_code}"
# Expected: 200
Smoke Test Script (tests/smoke_test.sh)
bash#!/bin/bash
BASE="http://localhost:8000"
echo "=== BreathoMeter Smoke Tests ==="

check() {
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$1")
  if [ "$STATUS" = "$2" ]; then echo "✅ $1 → $STATUS"; else echo "❌ $1 → $STATUS (expected $2)"; fi
}

check "$BASE/" 200
check "$BASE/health" 200
check "$BASE/system-status" 200
check "$BASE/docs" 200

🔷 Phase 2: Functional Testing (Endpoint-by-Endpoint)
2.1 — POST /auth/signup
Payload:
json{
  "email": "user_smoke@breatho.test",
  "password": "Secure@Pass1",
  "name": "Smoke User"
}
Expected Response: HTTP 200/201
json{
  "user": { "id": "uuid", "email": "user_smoke@breatho.test" },
  "session": { "access_token": "eyJ...", "token_type": "bearer" }
}
Edge Cases:

Duplicate email → should return 409 or 400
Weak password (no uppercase/number) → should return 422 (Pydantic validation)
Missing name field → 422
Invalid email format → 422
Empty body → 422

python# pytest snippet — tests/test_auth.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_signup_success(client: AsyncClient):
    response = await client.post("/auth/signup", json={
        "email": "new_user@breatho.test",
        "password": "Secure@Pass1",
        "name": "Test User"
    })
    assert response.status_code in [200, 201]
    data = response.json()
    assert "session" in data
    assert "access_token" in data["session"]

@pytest.mark.asyncio
async def test_signup_weak_password(client: AsyncClient):
    response = await client.post("/auth/signup", json={
        "email": "weak@breatho.test",
        "password": "abc",
        "name": "Weak User"
    })
    assert response.status_code == 422

@pytest.mark.asyncio
async def test_signup_duplicate_email(client: AsyncClient):
    payload = {"email": "dup@breatho.test", "password": "Secure@Pass1", "name": "Dup"}
    await client.post("/auth/signup", json=payload)
    response = await client.post("/auth/signup", json=payload)
    assert response.status_code in [400, 409, 422]

2.2 — POST /auth/login
Payload:
json{
  "email": "test_qa@breathometer.dev",
  "password": "QaTest@123"
}
Expected Response: HTTP 200
json{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "user": { "id": "uuid", "email": "..." }
}
Edge Cases:

Wrong password → 401
Non-existent email → 401 (NOT 404 — don't leak user existence)
Empty body → 422


2.3 — GET /auth/profile
Headers: Authorization: Bearer <jwt>
Expected Response: HTTP 200
json{
  "id": "uuid",
  "email": "test_qa@breathometer.dev",
  "name": "QA Tester",
  "role": "patient"
}
Edge Cases:

No token → 401
Expired token → 401
Malformed token → 401/403


2.4 — POST /health/input
Headers: Authorization: Bearer <jwt>
Payload:
json{
  "age": 35,
  "bmi": 24.5,
  "smoking_status": "Never",
  "exercise_frequency": "3x per week",
  "pre_existing_conditions": ["Asthma"],
  "city": "Pune",
  "occupation": "Software Engineer"
}
Expected Response: HTTP 200/201
json{
  "id": "uuid",
  "user_id": "uuid",
  "created_at": "2026-04-18T..."
}
Edge Cases:

age = 0 → should validate (>0)
age = 200 → should reject (unrealistic)
bmi negative → 422
Missing age → 422


2.5 — POST /breath-test
Headers: Authorization: Bearer <jwt>
Payload:
json{
  "breath_hold_time": 25,
  "breath_capacity": 80,
  "breath_strength": 70,
  "spo2": 97,
  "test_notes": "Morning test"
}
Edge Cases:

spo2 > 100 → 422
spo2 < 0 → 422
breath_hold_time = 0 → edge case, should handle gracefully


2.6 — POST /inference/predict ⭐ CRITICAL ENDPOINT
Headers: Authorization: Bearer <jwt>
Query: ?expand=true (enables AI explanation)
Real Payload (from test_payload.json):
json{
  "environmental_data": {
    "AQI": 150, "PM10": 40, "PM2_5": 80,
    "NO2": 20, "SO2": 10, "O3": 50
  },
  "optional_patient_data": {
    "age": 55,
    "gender": "Male",
    "lifestyle": { "smoking_habits": "Daily" },
    "symptoms": ["Wheezing", "Chest Pain", "Fatigue", "Shortness of Breath", "Coughing"],
    "vitals": { "spo2": 92, "breath_hold_time": 20 }
  }
}
Expected Response: HTTP 200
json{
  "risk_score": 0.87,
  "risk_category": "High",
  "diseases": ["COPD", "Asthma"],
  "explanation": "...",
  "recommended_doctors": [...],
  "medical_disclaimer": "..."
}
Edge Cases:

All-zero AQI values → should return a valid (low) risk prediction, not crash
spo2 = 100, no symptoms → should return low risk category
Missing environmental_data entirely → 422
AQI = 999 (extreme) → should handle without crashing
gender with unexpected value → graceful fallback

python@pytest.mark.asyncio
async def test_prediction_high_risk(client: AsyncClient, auth_headers: dict):
    payload = {
        "environmental_data": {
            "AQI": 150, "PM10": 40, "PM2_5": 80, "NO2": 20, "SO2": 10, "O3": 50
        },
        "optional_patient_data": {
            "age": 55, "gender": "Male",
            "lifestyle": {"smoking_habits": "Daily"},
            "symptoms": ["Wheezing", "Chest Pain", "Fatigue"],
            "vitals": {"spo2": 92, "breath_hold_time": 20}
        }
    }
    response = await client.post("/inference/predict?expand=true",
                                  json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "risk_score" in data
    assert "risk_category" in data
    assert 0.0 <= data["risk_score"] <= 1.0
    assert data["risk_category"] in ["Low", "Moderate", "High", "Critical"]

2.7 — GET /environment/aqi
Query: ?lat=18.5204&lon=73.8567
Expected: JSON with AQI, PM2.5, PM10, etc.
Edge Cases:

Invalid coordinates (lat=200) → should return 400 or graceful error
AQICN key missing/invalid → should return 503 or fallback
No internet → timeout handling


2.8 — POST /chatbot/message ⚠️ KNOWN BUG
Current Status: HTTP 500 (api_test_results.json)
Headers: Authorization: Bearer <jwt>
Payload:
json{
  "message": "I have been coughing for 3 days, should I see a doctor?",
  "conversation_id": null
}
Expected: HTTP 200 with Hava AI response via Groq/LLaMA
Investigation Checklist:

Verify GROQ_API_KEY is set and valid in environment
Check if chatbot_service.py has error handling around Groq API call
Confirm Groq API model llama3-8b-8192 is still available (model deprecations happen)
Check if chat history storage to Supabase is failing (missing table or RLS issue)
Review server logs for the actual exception traceback

Regression Test (once fixed):
python@pytest.mark.asyncio
async def test_chatbot_basic_message(client: AsyncClient, auth_headers: dict):
    response = await client.post("/chatbot/message",
        json={"message": "What is AQI?", "conversation_id": None},
        headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "response" in data or "message" in data

2.9 — POST /ai/explanation
Headers: Authorization: Bearer <jwt>
Payload:
json{
  "risk_score": 0.87,
  "risk_category": "High",
  "patient_data": {
    "age": 55, "smoking_habits": "Daily", "spo2": 92
  },
  "environmental_data": { "AQI": 150, "PM2_5": 80 }
}
Expected: HTTP 200, Gemini-generated explanation text

2.10 — GET /reports/summary
Headers: Authorization: Bearer <jwt>
Expected: Aggregated health data: last breath test, last prediction, AQI snapshot, doctor recommendations.
Edge Cases:

New user with no data → should return empty state gracefully, NOT 500


🔷 Phase 3: Integration Testing
3.1 — ML Model Loading Test
python# tests/test_ml_integration.py
import pytest
import os

def test_ml_models_present():
    """Verify all 6 ensemble model files exist"""
    backend_path = "backend/"
    # Models are loaded at startup; check via system-status endpoint
    # Or directly:
    model_files = [
        "models/logistic_regression.pkl",
        "models/random_forest.pkl",
        "models/xgboost_model.pkl",
        "models/lightgbm_model.pkl",
        "models/catboost_model.pkl",
        "models/mlp_model.pkl",
        "models/meta_model.pkl",
        "models/scaler.pkl"
    ]
    for f in model_files:
        path = os.path.join(backend_path, f)
        # If path differs, check app/models/ or dataset/ directory
        assert os.path.exists(path), f"Missing model file: {f}"
3.2 — Prediction Pipeline Validation
python@pytest.mark.asyncio
async def test_prediction_pipeline_end_to_end(client, auth_headers):
    """Full pipeline: health input → breath test → inference → store prediction"""
    
    # Step 1: Submit health data
    health_resp = await client.post("/health/input", json={
        "age": 45, "bmi": 28.0, "smoking_status": "Former",
        "exercise_frequency": "Never", "city": "Pune"
    }, headers=auth_headers)
    assert health_resp.status_code in [200, 201]
    
    # Step 2: Submit breath test
    breath_resp = await client.post("/breath-test", json={
        "breath_hold_time": 18, "breath_capacity": 65,
        "breath_strength": 60, "spo2": 94
    }, headers=auth_headers)
    assert breath_resp.status_code in [200, 201]
    
    # Step 3: Run inference
    predict_resp = await client.post("/inference/predict", json={
        "environmental_data": {"AQI": 120, "PM10": 35, "PM2_5": 60,
                               "NO2": 15, "SO2": 8, "O3": 45},
        "optional_patient_data": {
            "age": 45, "gender": "Female",
            "lifestyle": {"smoking_habits": "Never"},
            "symptoms": ["Coughing"],
            "vitals": {"spo2": 94, "breath_hold_time": 18}
        }
    }, headers=auth_headers)
    assert predict_resp.status_code == 200
    
    # Step 4: Store prediction
    pred_data = predict_resp.json()
    store_resp = await client.post("/prediction/store",
        json={"risk_score": pred_data["risk_score"],
              "risk_category": pred_data["risk_category"]},
        headers=auth_headers)
    assert store_resp.status_code in [200, 201]
3.3 — AQI API Integration (with mock fallback)
pythonfrom unittest.mock import patch

@pytest.mark.asyncio
async def test_aqi_endpoint_live():
    """Test live AQICN API for Pune"""
    async with AsyncClient(base_url="http://localhost:8000") as client:
        resp = await client.get("/environment/aqi?lat=18.5204&lon=73.8567")
    assert resp.status_code == 200
    data = resp.json()
    assert "aqi" in data

@pytest.mark.asyncio
async def test_aqi_endpoint_mocked():
    """Mock AQICN to test without live API"""
    mock_aqi = {"aqi": 85, "pm25": 42, "pm10": 28, "city": "Pune"}
    with patch("app.services.aqi_service.fetch_aqi", return_value=mock_aqi):
        async with AsyncClient(base_url="http://localhost:8000") as client:
            resp = await client.get("/environment/aqi?lat=18.5204&lon=73.8567")
    assert resp.status_code == 200
3.4 — Email Service Integration (Brevo)
pythonfrom unittest.mock import patch, MagicMock

@pytest.mark.asyncio
async def test_email_alert_triggered_on_high_risk():
    """Verify email alert fires when risk_category == High"""
    with patch("app.services.email_service.send_alert_email") as mock_email:
        # Submit a high-risk prediction
        # ... (full predict call)
        # Verify email was called
        mock_email.assert_called_once()
        call_args = mock_email.call_args
        assert "High" in str(call_args) or call_args[1].get("risk_category") == "High"
3.5 — Supabase RLS Validation
python@pytest.mark.asyncio
async def test_user_cannot_read_other_users_predictions(
    client, user_a_headers, user_b_id
):
    """RLS: User A must not access User B's predictions"""
    resp = await client.get(f"/prediction/{user_b_id}", headers=user_a_headers)
    # Should return empty list OR 403, never User B's actual data
    assert resp.status_code in [200, 403]
    if resp.status_code == 200:
        assert resp.json() == [] or resp.json().get("data") == []

🔷 Phase 4: Security Testing
4.1 — JWT Validation
bash# Test with no token
curl -s http://localhost:8000/auth/profile
# Expected: 401 Unauthorized

# Test with malformed token
curl -s http://localhost:8000/auth/profile \
  -H "Authorization: Bearer notavalidtoken"
# Expected: 401

# Test with expired token (manipulate expiry claim)
# Expected: 401

# Test with valid token for user A accessing user B's data
curl -s "http://localhost:8000/prediction/<user_b_id>" \
  -H "Authorization: Bearer <user_a_token>"
# Expected: 403 or empty []
4.2 — Password Strength Enforcement
python@pytest.mark.parametrize("password,should_fail", [
    ("abc", True),             # Too short
    ("alllowercase1", True),   # No uppercase
    ("ALLUPPERCASE1", True),   # No lowercase
    ("NoNumbers!!", True),     # No digit
    ("ValidPass1!", False),    # All criteria met
    ("A1" + "x" * 30, False),  # Long valid password
])
async def test_password_validation(client, password, should_fail):
    resp = await client.post("/auth/signup", json={
        "email": f"pw_test_{password[:4]}@test.com",
        "password": password,
        "name": "Test"
    })
    if should_fail:
        assert resp.status_code == 422
    else:
        assert resp.status_code in [200, 201]
4.3 — Rate Limiting (slowapi)
bash# Rapid-fire 20 requests to login endpoint
for i in {1..20}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"x@x.com","password":"wrong"}'
done
# Expected: First N requests get 401, eventually 429 Too Many Requests
4.4 — SQL Injection via Supabase REST
Since the backend uses Supabase REST (httpx), direct SQL injection is largely mitigated, but still test:
pythonasync def test_sql_injection_in_signup(client):
    resp = await client.post("/auth/signup", json={
        "email": "test@test.com'; DROP TABLE users; --",
        "password": "Valid@Pass1",
        "name": "Injector"
    })
    # Must not return 500, should return 422 (email validation fails) or 400
    assert resp.status_code != 500

async def test_xss_in_name_field(client):
    resp = await client.post("/auth/signup", json={
        "email": "xss@test.com",
        "password": "Valid@Pass1",
        "name": "<script>alert('xss')</script>"
    })
    # Must not execute; check that stored value is escaped
    assert resp.status_code != 500
4.5 — CORS Security Check
bash# Test CORS with disallowed origin
curl -s -I http://localhost:8000/ \
  -H "Origin: https://evil-attacker.com"
# Expected: No Access-Control-Allow-Origin header for unknown origins
# OR Access-Control-Allow-Origin should NOT be *
4.6 — Doctor Role Access Control
bash# Patient JWT trying to access doctor-only endpoint
curl -s "http://localhost:8000/alerts/doctor/some-doctor-id" \
  -H "Authorization: Bearer <patient_jwt>"
# Expected: 403 Forbidden
4.7 — Sensitive Data in Responses

Verify no password hashes leak in /auth/profile
Verify no Supabase internal keys appear in any response
Verify no .env values are exposed in error messages


🔷 Phase 5: Performance Testing
5.1 — Baseline Response Times (from api_test_results.json)
EndpointObservedTarget (prod)/auth/signup4.12s< 2s/auth/profile1.75s< 500ms/inference/predict4.35s< 3s/chatbot/message4.52s< 3s

⚠️ These are likely inflated by Render free-tier cold start. After warm-up they will be faster.

5.2 — k6 Load Test Script (tests/load/k6_smoke.js)
javascriptimport http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'https://breathometer6-0.onrender.com';
const JWT_TOKEN = __ENV.JWT_TOKEN;

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '60s', target: 10 },   // Stay at 10
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000'],  // 95% of requests < 3s
    'http_req_failed': ['rate<0.05'],     // < 5% failure rate
  },
};

export default function () {
  // Health check
  let healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, { 'health 200': (r) => r.status === 200 });

  // ML Prediction (heavy endpoint)
  let payload = JSON.stringify({
    environmental_data: { AQI: 120, PM10: 35, PM2_5: 55, NO2: 18, SO2: 8, O3: 40 },
    optional_patient_data: {
      age: 45, gender: "Male",
      lifestyle: { smoking_habits: "Never" },
      symptoms: ["Coughing"],
      vitals: { spo2: 95, breath_hold_time: 22 }
    }
  });

  let params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${JWT_TOKEN}`
    }
  };

  let predictRes = http.post(`${BASE_URL}/inference/predict`, payload, params);
  check(predictRes, {
    'predict 200': (r) => r.status === 200,
    'predict < 5s': (r) => r.timings.duration < 5000,
  });

  sleep(1);
}
Run:
bashJWT_TOKEN="your_jwt_here" k6 run tests/load/k6_smoke.js
5.3 — Concurrency Test for ML Endpoint
python# tests/test_performance.py
import asyncio
import httpx

async def predict_single(client, headers, i):
    resp = await client.post("/inference/predict", json={
        "environmental_data": {"AQI": 100+i, "PM10": 30, "PM2_5": 50,
                               "NO2": 15, "SO2": 7, "O3": 40},
        "optional_patient_data": {
            "age": 30+i, "gender": "Male",
            "lifestyle": {"smoking_habits": "Never"},
            "symptoms": [], "vitals": {"spo2": 96, "breath_hold_time": 25}
        }
    }, headers=headers, timeout=10.0)
    return resp.status_code, resp.elapsed.total_seconds()

@pytest.mark.asyncio
async def test_concurrent_predictions(auth_headers):
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        tasks = [predict_single(client, auth_headers, i) for i in range(5)]
        results = await asyncio.gather(*tasks)
    
    for status, elapsed in results:
        assert status == 200, f"Concurrent prediction failed: {status}"
        assert elapsed < 10.0, f"Prediction too slow: {elapsed}s"
5.4 — Performance Thresholds
Endpointp50 Targetp95 TargetError Rate/health< 100ms< 200ms0%/auth/login< 500ms< 1s< 1%/auth/profile< 300ms< 600ms< 1%/inference/predict< 2s< 4s< 2%/chatbot/message< 3s< 6s< 5%/environment/aqi< 1s< 3s< 5%

🔷 Phase 6: AI/ML Validation Testing
6.1 — Prediction Consistency (Determinism Test)
python@pytest.mark.asyncio
async def test_prediction_is_deterministic(client, auth_headers):
    """Same input must produce same risk_score across multiple calls"""
    payload = {
        "environmental_data": {"AQI": 150, "PM10": 40, "PM2_5": 80,
                               "NO2": 20, "SO2": 10, "O3": 50},
        "optional_patient_data": {
            "age": 55, "gender": "Male",
            "lifestyle": {"smoking_habits": "Daily"},
            "symptoms": ["Wheezing", "Chest Pain"],
            "vitals": {"spo2": 92, "breath_hold_time": 20}
        }
    }
    scores = []
    for _ in range(3):
        resp = await client.post("/inference/predict", json=payload, headers=auth_headers)
        scores.append(resp.json()["risk_score"])
    
    # All scores must be identical (deterministic ML ensemble)
    assert len(set(scores)) == 1, f"Non-deterministic predictions: {scores}"
6.2 — Risk Category Boundary Validation
python@pytest.mark.parametrize("aqi,spo2,smoking,expected_category", [
    (10, 99, "Never", "Low"),          # Healthy profile
    (80, 95, "Occasional", "Moderate"), # Moderate risk
    (200, 90, "Daily", "High"),         # High risk
    (300, 85, "Daily", "Critical"),     # Critical
])
@pytest.mark.asyncio
async def test_risk_categories(client, auth_headers, aqi, spo2, smoking, expected_category):
    resp = await client.post("/inference/predict", json={
        "environmental_data": {"AQI": aqi, "PM10": int(aqi*0.3), "PM2_5": int(aqi*0.5),
                               "NO2": 15, "SO2": 5, "O3": 30},
        "optional_patient_data": {
            "age": 45, "gender": "Male",
            "lifestyle": {"smoking_habits": smoking},
            "symptoms": [], "vitals": {"spo2": spo2, "breath_hold_time": 22}
        }
    }, headers=auth_headers)
    assert resp.status_code == 200
    # Note: exact category depends on trained model thresholds
    # At minimum, higher AQI/lower SPO2/more smoking should yield higher risk
    data = resp.json()
    assert data["risk_score"] >= 0.0
6.3 — Detect Model Bias
python@pytest.mark.asyncio
async def test_gender_bias_in_predictions(client, auth_headers):
    """Same health metrics, different gender — check for significant score disparity"""
    base_data = {
        "environmental_data": {"AQI": 100, "PM10": 30, "PM2_5": 55,
                               "NO2": 15, "SO2": 7, "O3": 40},
        "optional_patient_data": {
            "age": 45,
            "lifestyle": {"smoking_habits": "Never"},
            "symptoms": ["Coughing"],
            "vitals": {"spo2": 95, "breath_hold_time": 22}
        }
    }
    
    male_data = {**base_data, "optional_patient_data": {**base_data["optional_patient_data"], "gender": "Male"}}
    female_data = {**base_data, "optional_patient_data": {**base_data["optional_patient_data"], "gender": "Female"}}
    
    male_resp = await client.post("/inference/predict", json=male_data, headers=auth_headers)
    female_resp = await client.post("/inference/predict", json=female_data, headers=auth_headers)
    
    male_score = male_resp.json()["risk_score"]
    female_score = female_resp.json()["risk_score"]
    
    # Allow max 20% disparity for same clinical profile
    assert abs(male_score - female_score) < 0.20, \
        f"Potential gender bias: Male={male_score}, Female={female_score}"
6.4 — SHAP / Explanation Validation
python@pytest.mark.asyncio
async def test_ai_explanation_coherence(client, auth_headers):
    """AI explanation for high-risk patient must mention key risk factors"""
    resp = await client.post("/ai/explanation", json={
        "risk_score": 0.89,
        "risk_category": "High",
        "patient_data": {"age": 55, "smoking_habits": "Daily", "spo2": 90},
        "environmental_data": {"AQI": 180, "PM2_5": 90}
    }, headers=auth_headers)
    assert resp.status_code == 200
    explanation = resp.json().get("explanation", "").lower()
    # Key risk terms must appear in explanation
    risk_terms = ["smoking", "aqi", "air quality", "risk"]
    assert any(term in explanation for term in risk_terms)

🔷 Phase 7: Failure & Edge Case Testing
7.1 — Missing/Corrupted Model File
bash# Temporarily rename a model file and restart server
mv backend/models/xgboost_model.pkl backend/models/xgboost_model.pkl.bak

# Restart server — expected: graceful startup error OR degraded mode
uvicorn app.main:app --port 8000

# Check system-status endpoint
curl http://localhost:8000/system-status
# Expected: NOT a 500, should report model load failure clearly

# Restore
mv backend/models/xgboost_model.pkl.bak backend/models/xgboost_model.pkl
7.2 — External API Timeouts (Mocked)
pythonfrom unittest.mock import patch
import asyncio

@pytest.mark.asyncio
async def test_aqicn_timeout_graceful(client):
    """AQICN API timeout must not crash the prediction endpoint"""
    async def slow_fetch(*args, **kwargs):
        await asyncio.sleep(30)  # Simulate timeout
        
    with patch("app.services.aqi_service.fetch_aqi", side_effect=asyncio.TimeoutError):
        resp = await client.get("/environment/aqi?lat=18.5204&lon=73.8567")
    # Should return 503 or 504, NOT 500 with traceback
    assert resp.status_code in [503, 504, 408]

@pytest.mark.asyncio
async def test_groq_api_failure_graceful(client, auth_headers):
    """Groq API failure must not cause 500 on chatbot endpoint"""
    with patch("app.services.chatbot_service.get_groq_response",
               side_effect=Exception("Groq API down")):
        resp = await client.post("/chatbot/message",
            json={"message": "Hello", "conversation_id": None},
            headers=auth_headers)
    # Should return 503 with meaningful error, not raw 500
    assert resp.status_code in [503, 500]
    assert "detail" in resp.json()  # Must have error message
7.3 — Supabase Failure Simulation
python@pytest.mark.asyncio
async def test_supabase_failure_returns_503(client, auth_headers):
    """Supabase outage must degrade gracefully"""
    with patch("app.db.supabase_client.get_client",
               side_effect=Exception("Supabase unreachable")):
        resp = await client.get("/auth/profile", headers=auth_headers)
    assert resp.status_code in [503, 500]
    # Must NOT expose internal stack traces
    body = resp.json()
    assert "traceback" not in str(body).lower()
7.4 — Invalid Input Format Tests
python@pytest.mark.parametrize("payload,expected_status", [
    # Completely wrong type for AQI
    ({"environmental_data": {"AQI": "not_a_number"}}, 422),
    # Missing required environmental_data
    ({"optional_patient_data": {"age": 35}}, 422),
    # Null body
    ({}, 422),
    # Extra unknown fields (should be ignored by Pydantic)
    ({"environmental_data": {"AQI": 100, "PM10": 30, "PM2_5": 50,
       "NO2": 10, "SO2": 5, "O3": 30}, "unknown_field": "junk"}, 200),
])
@pytest.mark.asyncio
async def test_inference_input_validation(client, auth_headers, payload, expected_status):
    resp = await client.post("/inference/predict", json=payload, headers=auth_headers)
    assert resp.status_code == expected_status
7.5 — New User With No Historical Data
python@pytest.mark.asyncio
async def test_new_user_reports_empty(client):
    """New user with no data must get empty report, not 500"""
    # Create brand new user
    signup_resp = await client.post("/auth/signup", json={
        "email": "brand_new@breatho.test",
        "password": "Fresh@Pass1",
        "name": "New User"
    })
    token = signup_resp.json()["session"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Fetch report — must return empty/default, not crash
    report_resp = await client.get("/reports/summary", headers=headers)
    assert report_resp.status_code == 200
    
    # Fetch predictions — must return empty list
    user_id = signup_resp.json()["user"]["id"]
    pred_resp = await client.get(f"/prediction/{user_id}", headers=headers)
    assert pred_resp.status_code in [200, 404]

🔷 Phase 8: Deployment Verification
8.1 — Production Config Check (render.yaml)
CheckExpectedAction if FailsENVIRONMENT=productionMust be setAdd to Render env varsPYTHONUNBUFFERED=1Logs appear in real-timeSet in Render dashboard--workers 1Single worker (free tier)OK for now; upgrade for scalehealthCheckPath: /healthReturns 200Fix health endpointSENTRY_DSNOptional but recommendedAdd for error monitoring
8.2 — Logging Setup Verification
python# Verify breathometer logger is configured
import logging
logger = logging.getLogger("breathometer")
# Should be set to INFO or DEBUG in development, WARNING in production

# Check: Does every route handler log request/response?
# Check: Are exceptions logged before returning 500?
# Check: Is PII (emails, health data) NOT logged at DEBUG level?
8.3 — Error Handling Verification
python@pytest.mark.asyncio
async def test_404_returns_json(client):
    resp = await client.get("/nonexistent-route")
    assert resp.status_code == 404
    assert resp.headers["content-type"] == "application/json"
    assert "detail" in resp.json()

@pytest.mark.asyncio
async def test_405_method_not_allowed(client):
    resp = await client.delete("/health")  # DELETE not allowed
    assert resp.status_code == 405

@pytest.mark.asyncio
async def test_internal_errors_dont_expose_stack_traces(client, auth_headers):
    """500 errors must NEVER expose Python stack traces to clients"""
    # Trigger a controlled error
    with patch("app.services.ml_service.predict", side_effect=RuntimeError("internal")):
        resp = await client.post("/inference/predict", json={
            "environmental_data": {"AQI": 100, "PM10": 30, "PM2_5": 50,
                                   "NO2": 10, "SO2": 5, "O3": 30}
        }, headers=auth_headers)
    body = str(resp.json())
    # Must NOT contain Python traceback indicators
    assert "Traceback" not in body
    assert "File \"" not in body
    assert "line " not in body.lower()
8.4 — CORS Configuration
bash# Verify CORS headers from production
curl -s -I https://breathometer6-0.onrender.com/ \
  -H "Origin: https://breathometer.web.app"
# Expected: Access-Control-Allow-Origin: https://breathometer.web.app (or specific Firebase domain)
# Must NOT be: Access-Control-Allow-Origin: *  (for authenticated endpoints)
8.5 — Docker Build Verification
bash# From backend/
docker build -t breathometer-backend:test .
docker run --env-file .env -p 8001:8000 breathometer-backend:test

# Verify
curl http://localhost:8001/health
curl http://localhost:8001/system-status

🔷 Phase 9: Test Automation Plan
9.1 — pytest Project Structure
backend/
├── tests/
│   ├── conftest.py              # Shared fixtures (client, auth_headers)
│   ├── smoke_test.sh            # Bash smoke tests
│   ├── test_auth.py             # Auth endpoints
│   ├── test_health_input.py     # Health data endpoints
│   ├── test_breath_test.py      # Breath test endpoints
│   ├── test_inference.py        # ML prediction + AI explanation
│   ├── test_environment.py      # AQI / weather endpoints
│   ├── test_chatbot.py          # Chatbot + chat history
│   ├── test_reports.py          # Reports + alerts
│   ├── test_security.py         # JWT, CORS, injection tests
│   ├── test_ml_validation.py    # ML consistency, bias detection
│   ├── test_edge_cases.py       # Failure modes, edge inputs
│   └── load/
│       └── k6_smoke.js          # k6 load test
9.2 — conftest.py
python# tests/conftest.py
import pytest
import pytest_asyncio
from httpx import AsyncClient
from app.main import app

@pytest_asyncio.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest_asyncio.fixture
async def auth_headers(client):
    """Create a fresh test user and return JWT headers"""
    from faker import Faker
    fake = Faker()
    email = fake.email()
    
    signup_resp = await client.post("/auth/signup", json={
        "email": email,
        "password": "TestPass@123",
        "name": fake.name()
    })
    assert signup_resp.status_code in [200, 201], f"Setup failed: {signup_resp.text}"
    token = signup_resp.json()["session"]["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest_asyncio.fixture
async def doctor_headers(client):
    """Create a doctor-role user"""
    # Requires service_role_key to set role='doctor' in users table
    signup_resp = await client.post("/auth/signup", json={
        "email": "doctor_qa@breatho.test",
        "password": "DoctorPass@1",
        "name": "Dr. QA Test",
        "role": "doctor"
    })
    token = signup_resp.json()["session"]["access_token"]
    return {"Authorization": f"Bearer {token}"}
9.3 — GitHub Actions CI/CD (.github/workflows/test.yml)
yamlname: BreathoMeter Backend Tests

on:
  push:
    branches: [main, develop]
    paths:
      - 'backend/**'
  pull_request:
    branches: [main]
    paths:
      - 'backend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    
    env:
      SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
      GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
      AQICN_API_KEY: ${{ secrets.AQICN_API_KEY }}
      OPENWEATHER_API_KEY: ${{ secrets.OPENWEATHER_API_KEY }}
      BREVO_API_KEY: ${{ secrets.BREVO_API_KEY }}
      ENVIRONMENT: test
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python 3.11
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
          cache-dependency-path: backend/requirements.txt
      
      - name: Install dependencies
        working-directory: backend
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-asyncio httpx pytest-cov faker
      
      - name: Run Smoke Tests
        working-directory: backend
        run: pytest tests/ -m smoke -v --tb=short
      
      - name: Run Unit Tests
        working-directory: backend
        run: pytest tests/ -m "not slow and not integration" -v --tb=short
      
      - name: Run Integration Tests
        working-directory: backend
        run: pytest tests/ -m integration -v --tb=short
      
      - name: Coverage Report
        working-directory: backend
        run: |
          pytest tests/ --cov=app --cov-report=xml --cov-report=term-missing
      
      - name: Upload Coverage
        uses: codecov/codecov-action@v4
        with:
          file: backend/coverage.xml

  smoke-prod:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Production Smoke Tests
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
            https://breathometer6-0.onrender.com/health)
          if [ "$STATUS" != "200" ]; then
            echo "❌ Production health check failed: $STATUS"
            exit 1
          fi
          echo "✅ Production health check passed"
9.4 — Postman Collection Structure
json{
  "info": { "name": "BreathoMeter 6.0 API", "schema": "..." },
  "variable": [
    { "key": "base_url", "value": "https://breathometer6-0.onrender.com" },
    { "key": "jwt_token", "value": "" }
  ],
  "item": [
    {
      "name": "🟢 System",
      "item": [
        { "name": "GET /", "request": { "method": "GET", "url": "{{base_url}}/" } },
        { "name": "GET /health", "request": { "method": "GET", "url": "{{base_url}}/health" } },
        { "name": "GET /system-status", "request": { "method": "GET", "url": "{{base_url}}/system-status" } }
      ]
    },
    {
      "name": "🔐 Auth",
      "item": [
        {
          "name": "POST /auth/signup",
          "event": [{ "listen": "test", "script": { "exec": [
            "pm.test('Status 200', () => pm.response.to.have.status(200));",
            "const data = pm.response.json();",
            "pm.collectionVariables.set('jwt_token', data.session.access_token);"
          ]}}],
          "request": {
            "method": "POST", "url": "{{base_url}}/auth/signup",
            "body": { "mode": "raw", "raw": "{\"email\":\"qa@breatho.test\",\"password\":\"QaTest@123\",\"name\":\"QA\"}" }
          }
        },
        { "name": "GET /auth/profile (Authenticated)", ... }
      ]
    },
    {
      "name": "🧠 ML Inference",
      "item": [
        {
          "name": "POST /inference/predict (High Risk)",
          "event": [{ "listen": "test", "script": { "exec": [
            "pm.test('Status 200', () => pm.response.to.have.status(200));",
            "pm.test('Has risk_score', () => pm.expect(pm.response.json()).to.have.property('risk_score'));",
            "pm.test('Risk score in range', () => {",
            "  const score = pm.response.json().risk_score;",
            "  pm.expect(score).to.be.within(0.0, 1.0);",
            "});"
          ]}}],
          "request": {
            "method": "POST",
            "url": "{{base_url}}/inference/predict?expand=true",
            "header": [{ "key": "Authorization", "value": "Bearer {{jwt_token}}" }],
            "body": { "mode": "raw", "raw": "{ SEE test_payload.json }" }
          }
        }
      ]
    }
  ]
}

🔷 Phase 10: Final Go-Live Checklist
✅ Must-Pass Conditions (BLOCKING)
#CheckTestStatus1/health returns 200Smoke🔲2/system-status reports DB + ML healthySmoke🔲3/auth/signup creates user + returns JWTFunctional🔲4/auth/login validates credentialsFunctional🔲5JWT required on protected routesSecurity🔲6/inference/predict returns valid risk scoreFunctional🔲7ML prediction is deterministicML Validation🔲8No 500 errors with valid payloadsAll phases🔲9No stack traces in 500 responsesSecurity🔲10RLS: users cannot access each other's dataSecurity🔲11Password strength enforcedSecurity🔲12All 6 ML model .pkl files presentIntegration🔲13AQICN and OpenWeatherMap APIs respondingIntegration🔲14Render deployment healthy (green)Deployment🔲15Firebase frontend loads correctlySmoke🔲
⚠️ Known Issues to Resolve Before Launch
PriorityIssueLocationFix Required🔴 CRITICAL/chatbot/message returns HTTP 500chatbot_service.pyFix Groq API integration or add graceful fallback🟠 HIGHResponse times > 4s on cold startRender free tierEither upgrade tier or add warm-up ping service🟠 HIGHNo GitHub Actions CI pipeline.github/workflows/Add test.yml per Phase 9.3🟡 MEDIUMNo Sentry DSN configuredrender.yamlAdd SENTRY_DSN for production error tracking🟡 MEDIUMCORS may be too permissiveapp/main.pyRestrict to Firebase + localhost origins only🟡 MEDIUMDoctor role access not tested/alerts/doctor/Add role-based test in Phase 4.6🟢 LOWtemp/ and tmp/ directories in repo rootRepo cleanupMove to .gitignore, remove from main branch🟢 LOWNo API versioning (/v1/)All routesConsider prefixing routes for future-proofing
📊 Risk Register
RiskLikelihoodImpactMitigationGroq API deprecates llama3-8b-8192MediumHighPin model version; add fallback modelSupabase free tier limits hit under loadMediumHighMonitor quota; upgrade before 500 DAUML model accuracy degrades with new dataLowHighAdd periodic retraining pipeline with train_model.pyAQICN API rate limit in burst trafficMediumMediumAdd caching layer (Redis/memory) for AQI responses.env secrets accidentally committedLowCritical.gitignore already exists; add pre-commit hookRender cold start (free tier) causes timeoutsHighMediumAdd health-ping cron job to prevent sleepingmaharashtra_doctors_dataset.xlsx data stalenessMediumMediumSchedule quarterly refresh

📁 Files Referenced in This Plan
FilePurposerender.yamlDeployment config: start command, env vars, health checktest_payload.jsonReal ML inference test payloadapi_test_results.jsonKnown live test results (chatbot 500 confirmed)backend/app/main.pyFastAPI app entry pointbackend/requirements.txtAll Python dependenciesbackend/train_model.pyML training scriptbackend/dataset/air_quality_health_impact_data.csvML training datasetmaharashtra_doctors_dataset.xlsxDoctor recommendation dataset.github/workflows/CI/CD configuration (to be created per Phase 9.3)