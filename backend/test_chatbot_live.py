"""
test_chatbot_live.py
Diagnoses the live chatbot failure end-to-end.
Run: python test_chatbot_live.py
"""
import requests
import json

BASE = "https://breathometer6-0.onrender.com"

# --- Step 1: Login ---
print("=" * 55)
print("STEP 1: Login")
r = requests.post(
    f"{BASE}/auth/login",
    json={"username": "pranav", "password": "Pr@131006"},
    timeout=15,
)
print(f"  Status: {r.status_code}")
data = r.json()

# Token lives inside the session object
session = data.get("session", {})
token = (
    session.get("access_token")
    or data.get("access_token")
    or data.get("token")
)

if not token:
    print("  ERROR: No token found in response!")
    print("  Response:", json.dumps(data, indent=2)[:500])
    exit(1)

print(f"  Token: {token[:40]}...")

# --- Step 2: Hit /chatbot/message ---
print()
print("=" * 55)
print("STEP 2: POST /chatbot/message")
r2 = requests.post(
    f"{BASE}/chatbot/message",
    json={"message": "What should I do if my AQI is unhealthy today?", "user_context": {}},
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    },
    timeout=30,
)
print(f"  Status: {r2.status_code}")

if r2.status_code == 200:
    reply = r2.json().get("reply", "")
    print(f"  SUCCESS! Reply preview:")
    print(f"  {reply[:300]}")
else:
    print(f"  ERROR BODY: {r2.text[:600]}")

# --- Step 3: Check the AI router directly ---
print()
print("=" * 55)
print("STEP 3: Test AI providers directly")

import os, sys
sys.path.insert(0, "app")
os.chdir(".")

# Test Gemini
try:
    import httpx
    from dotenv import load_dotenv
    load_dotenv()
    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    groq_key = os.environ.get("GROQ_API_KEY", "")
    print(f"  GEMINI_API_KEY set locally: {bool(gemini_key)}")
    print(f"  GROQ_API_KEY   set locally: {bool(groq_key)}")
except Exception as e:
    print(f"  Could not check local keys: {e}")

print()
print("=" * 55)
if r2.status_code == 200:
    print("  VERDICT: CHATBOT IS WORKING")
else:
    print(f"  VERDICT: CHATBOT FAILING — HTTP {r2.status_code}")
    print("  Check Render logs for the AI provider error above.")
print("=" * 55)
