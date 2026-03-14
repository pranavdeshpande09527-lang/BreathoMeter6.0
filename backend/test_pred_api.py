import urllib.request
import json
import uuid

import uuid
email = f"test_{uuid.uuid4().hex[:8]}@test.com"

# 1. Signup
signup_data = json.dumps({"email": email, "password": "Password123!", "full_name": "Test User"}).encode('utf-8')
req = urllib.request.Request("http://localhost:8000/auth/signup", data=signup_data, headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as response:
        res = json.loads(response.read().decode())
        token = res.get('access_token') or res.get('session', {}).get('access_token')
        print("Signup success, token:", bool(token))
except urllib.error.HTTPError as e:
    token = None
    print("Signup error:", e.read().decode())

if token:
    # 2. Prediction Store
    pred_data = json.dumps({
        "final_risk_score": 0.75,
        "risk_category": "High Risk",
        "ai_explanation": "Test explanation",
        "top_risk_factors": ["Smoking", "Age"]
    }).encode('utf-8')
    req2 = urllib.request.Request("http://localhost:8000/prediction/store", data=pred_data, headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'})
    try:
        with urllib.request.urlopen(req2) as response:
            print("Prediction store success:", response.read().decode())
    except urllib.error.HTTPError as e:
        print("Prediction store error:", e.read().decode())
