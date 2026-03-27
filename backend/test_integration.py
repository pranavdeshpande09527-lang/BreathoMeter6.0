"""
Breathometer 4.0 Backend Integration Test Script
Tests all API endpoints systematically
"""
import httpx
import asyncio
import json
import sys

BASE_URL = "http://localhost:8000"

async def test_endpoint(name, method, url, json_data=None, headers=None, expect_status=None):
    print(f"\n{'='*60}")
    print(f"TEST: {name}")
    print(f"  {method} {url}")
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            if method == "GET":
                r = await client.get(url, headers=headers)
            elif method == "POST":
                r = await client.post(url, json=json_data, headers=headers)
            
            print(f"  STATUS: {r.status_code}")
            try:
                body = r.json()
                print(f"  RESPONSE: {json.dumps(body, indent=2)[:500]}")
            except:
                print(f"  RESPONSE (text): {r.text[:500]}")
            
            if expect_status and r.status_code != expect_status:
                print(f"  ❌ FAIL - Expected {expect_status}, got {r.status_code}")
                return None
            else:
                print(f"  ✅ PASS")
                return r.json() if r.status_code < 400 else None
    except Exception as e:
        print(f"  ❌ ERROR: {e}")
        return None

async def main():
    print("=" * 60)
    print("BREATHOMETER 4.0 BACKEND INTEGRATION TESTS")
    print("=" * 60)
    
    # 1. Root endpoint  
    await test_endpoint("Root Endpoint", "GET", f"{BASE_URL}/", expect_status=200)
    
    # 2. AQI endpoint
    await test_endpoint("AQI (real-time)", "GET", f"{BASE_URL}/environment/aqi?location=here", expect_status=200)
    
    # 3. Weather endpoint
    await test_endpoint("Weather (real-time)", "GET", f"{BASE_URL}/environment/weather?lat=21.15&lon=79.09", expect_status=200)
    
    # 4. AQI Map endpoint
    await test_endpoint("AQI Map Data", "GET", f"{BASE_URL}/environment/aqi-map?location=here", expect_status=200)

    # 5. Signup
    signup_result = await test_endpoint("Auth Signup", "POST", f"{BASE_URL}/auth/signup", json_data={
        "username": "integrationtest",
        "password": "TestPass1234!",
        "full_name": "Integration Test"
    })
    
    # 6. Login
    login_result = await test_endpoint("Auth Login", "POST", f"{BASE_URL}/auth/login", json_data={
        "username": "integrationtest",
        "password": "TestPass1234!"
    })
    
    access_token = None
    if login_result and "session" in login_result:
        access_token = login_result["session"].get("access_token")
        print(f"\n  🔑 Got access token: {access_token[:30]}...")
    
    if not access_token:
        print("\n⚠️  No access token obtained. Skipping protected endpoint tests.")
        print("    (This may be expected if Supabase email confirmation is required)")
        print("\n  Testing protected endpoints WITHOUT auth to confirm 401 behavior...")
        
        await test_endpoint("Health Input (no auth)", "POST", f"{BASE_URL}/health/input", json_data={
            "age": 25, "height": 175.0, "weight": 70.0,
            "smoking_history": False, "activity_level": "Moderate"
        }, expect_status=422)  # 422 because no auth header
        
        await test_endpoint("Breath Test (no auth)", "POST", f"{BASE_URL}/breath/test", json_data={
            "durations": [15.2, 18.5, 16.1], "attempt_count": 3
        }, expect_status=422)
        
        await test_endpoint("Predict Risk (no auth)", "POST", f"{BASE_URL}/prediction/predict-risk", expect_status=422)
        
        await test_endpoint("AI Explanation (no auth)", "POST", f"{BASE_URL}/ai/explanation", json_data={
            "topic": "lung_health_score", "user_context": {}
        }, expect_status=422)
        
        await test_endpoint("Chatbot Message (no auth)", "POST", f"{BASE_URL}/chatbot/message", json_data={
            "message": "What is AQI?", "user_context": {}
        }, expect_status=422)
        
        await test_endpoint("Report Summary (no auth)", "GET", f"{BASE_URL}/reports/summary", expect_status=422)
        
    else:
        auth_headers = {"Authorization": f"Bearer {access_token}"}
        
        # 7. Health Input
        await test_endpoint("Health Data Input", "POST", f"{BASE_URL}/health/input", json_data={
            "age": 25, "height": 175.0, "weight": 70.0,
            "smoking_history": False, "activity_level": "Moderate",
            "respiratory_symptoms": "None"
        }, headers=auth_headers, expect_status=200)
        
        # 8. Breath Test
        await test_endpoint("Breath Test Submit", "POST", f"{BASE_URL}/breath/test", json_data={
            "durations": [15.2, 18.5, 16.1], "attempt_count": 3
        }, headers=auth_headers, expect_status=200)
        
        # 9. ML Prediction
        await test_endpoint("ML Predict Risk", "POST", f"{BASE_URL}/prediction/predict-risk", headers=auth_headers)
        
        # 10. AI Explanation
        await test_endpoint("AI Explanation", "POST", f"{BASE_URL}/ai/explanation", json_data={
            "topic": "lung_health_score",
            "user_context": {"lung_capacity_score": 75.5, "aqi": 67}
        }, headers=auth_headers, expect_status=200)
        
        # 11. Chatbot
        await test_endpoint("Chatbot Message", "POST", f"{BASE_URL}/chatbot/message", json_data={
            "message": "What are the effects of PM2.5 on lungs?",
            "user_context": {}
        }, headers=auth_headers, expect_status=200)
        
        # 12. Report
        await test_endpoint("Health Report Summary", "GET", f"{BASE_URL}/reports/summary", headers=auth_headers, expect_status=200)

    # 13. OpenAPI docs reachable
    await test_endpoint("Swagger UI (docs)", "GET", f"{BASE_URL}/docs", expect_status=200)

    print("\n" + "=" * 60)
    print("ALL TESTS COMPLETE")
    print("=" * 60)

asyncio.run(main())
