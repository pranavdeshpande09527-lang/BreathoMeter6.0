import requests
import json
import uuid

BASE_URL = "https://breathometer6-0.onrender.com"

results = []

def test_endpoint(name, method, url, data=None, headers=None):
    try:
        if method == "POST":
            res = requests.post(url, json=data, headers=headers, timeout=15)
        elif method == "GET":
            res = requests.get(url, headers=headers, timeout=15)
            
        status = "✅ Working" if res.status_code in [200, 201] else f"❌ Failed ({res.status_code})"
        time_elapsed = res.elapsed.total_seconds()
        
        err_msg = ""
        if res.status_code not in [200, 201]:
            try:
                err_msg = res.json()
            except:
                err_msg = res.text[:200]
                
        results.append({
            "name": name,
            "url": url,
            "method": method,
            "status": status,
            "time": f"{time_elapsed:.2f}s",
            "error": err_msg,
            "response": res.json() if res.status_code in [200, 201] else None
        })
        return res
    except Exception as e:
        results.append({
            "name": name,
            "url": url,
            "method": method,
            "status": "❌ Failed (Network/Timeout)",
            "time": "-",
            "error": str(e),
            "response": None
        })
        return None

# Generate unique username
username = f"testuser_{uuid.uuid4().hex[:8]}"
password = "Password123!"

print(f"Testing with username: {username}")

# 1. Signup
res_signup = test_endpoint("Auth - Signup", "POST", f"{BASE_URL}/auth/signup", data={
    "username": username,
    "password": password,
    "full_name": "Test User",
    "role": "patient",
    "age": 30,
    "gender": "Male",
    "height": 175,
    "weight": 70,
    "smoking_status": "Never",
    "activity_level": "Moderate"
})

token = None
if res_signup and res_signup.status_code == 200:
    token = res_signup.json().get("session", {}).get("access_token")

# 2. Login (fallback)
if not token:
    res_login = test_endpoint("Auth - Login", "POST", f"{BASE_URL}/auth/login", data={
        "username": username,
        "password": password
    })
    if res_login and res_login.status_code == 200:
        token = res_login.json().get("session", {}).get("access_token")

# 3. Test Profile (Needs Auth)
auth_headers = {"Authorization": f"Bearer {token}"} if token else {}

test_endpoint("Auth - Get Profile", "GET", f"{BASE_URL}/auth/profile", headers=auth_headers)

# 4. Chatbot Message
test_endpoint("Chatbot - Message", "POST", f"{BASE_URL}/chatbot/message", data={
    "message": "What can I do to improve my indoor air quality?",
    "user_context": {}
}, headers=auth_headers)

# 5. Inference
test_endpoint("Inference - Predict", "POST", f"{BASE_URL}/inference/predict?expand=true", data={
    "environmental_data": {
        "AQI": 120,
        "PM10": 80,
        "PM2_5": 60,
        "NO2": 20,
        "SO2": 10,
        "O3": 30,
        "Temperature": 25,
        "Humidity": 60,
        "WindSpeed": 5,
        "RespiratoryCases": 10,
        "CardiovascularCases": 5,
        "HospitalAdmissions": 2,
        "HealthImpactScore": 50
    },
    "optional_patient_data": {
        "age": 30,
        "gender": "Male",
        "symptoms": ["cough"],
        "lifestyle": {"smoking_habits": "Never"},
        "vitals": {
            "spo2": 98,
            "breath_hold_time": 45,
            "inhale_capacity": 5,
            "exhale_capacity": 4
        }
    }
}, headers=auth_headers)

for r in results:
    if "response" in r:
        del r["response"]  # just for print clarity

with open("api_test_results.json", "w") as f:
    json.dump(results, f, indent=2)

print("Tests completed. Checking results:")
for r in results:
    print(f"{r['name']}: {r['status']} Error: {r['error']}")
