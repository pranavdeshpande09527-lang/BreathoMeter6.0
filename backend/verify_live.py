"""
verify_live.py - Full live verification of Breathometer backend
Run: python verify_live.py
"""
import requests
import json
import time

BASE = "https://breathometer6-0.onrender.com"
FRONTEND_ORIGIN = "https://breathometer6.web.app"

results = []

def check(label, ok, detail=""):
    status = "PASS" if ok else "FAIL"
    results.append((status, label, detail))
    print(f"  [{status}] {label}" + (f" — {detail}" if detail else ""))


print("=" * 55)
print("  BREATHOMETER LIVE VERIFICATION")
print("=" * 55)

# 1. Health probe
try:
    r = requests.get(f"{BASE}/health", timeout=10)
    check("/health", r.status_code == 200 and r.text.strip() == "OK", r.text.strip())
except Exception as e:
    check("/health", False, str(e))

# 2. Ping probe
try:
    r = requests.get(f"{BASE}/ping", timeout=10)
    check("/ping", r.status_code == 200, r.text.strip())
except Exception as e:
    check("/ping", False, str(e))

# 3. System status
try:
    r = requests.get(f"{BASE}/system-status", timeout=15)
    d = r.json()
    api_ok = d.get("api") == "ok"
    db_ok  = d.get("database") == "ok"
    ml_val = d.get("ml_models", "?")
    ml_ok  = ml_val in ("fully_loaded", "clinical_only")
    check("system-status api=ok",      api_ok,  d.get("api"))
    check("system-status database=ok", db_ok,   d.get("database"))
    check("system-status ml_models",   ml_ok,   f"{ml_val} (clinical_only is expected on free-tier)")
except Exception as e:
    check("/system-status", False, str(e))

# 4. CORS preflight — chatbot
try:
    r = requests.options(
        f"{BASE}/chatbot/message",
        headers={
            "Origin": FRONTEND_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,authorization",
        },
        timeout=10,
        allow_redirects=False,
    )
    cors_origin = r.headers.get("access-control-allow-origin", "")
    cors_ok = cors_origin == FRONTEND_ORIGIN
    check("CORS preflight /chatbot/message", cors_ok, f"allow-origin: {cors_origin or 'MISSING'}")
except Exception as e:
    check("CORS preflight", False, str(e))

# 5. Chatbot endpoint exists (401 expected without token)
try:
    r = requests.post(
        f"{BASE}/chatbot/message",
        json={"message": "Hello", "conversation_history": []},
        headers={"Content-Type": "application/json"},
        timeout=15,
    )
    check("/chatbot/message auth guard", r.status_code == 401, f"got {r.status_code}")
except Exception as e:
    check("/chatbot/message", False, str(e))

# 6. Inference endpoint exists (401 expected without token)
try:
    r = requests.post(
        f"{BASE}/inference/predict",
        json={},
        headers={"Content-Type": "application/json"},
        timeout=15,
    )
    check("/inference/predict auth guard", r.status_code in (401, 422), f"got {r.status_code}")
except Exception as e:
    check("/inference/predict", False, str(e))

# 7. CORS preflight — inference
try:
    r = requests.options(
        f"{BASE}/inference/predict",
        headers={
            "Origin": FRONTEND_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,authorization",
        },
        timeout=10,
        allow_redirects=False,
    )
    cors_origin = r.headers.get("access-control-allow-origin", "")
    cors_ok = cors_origin == FRONTEND_ORIGIN
    check("CORS preflight /inference/predict", cors_ok, f"allow-origin: {cors_origin or 'MISSING'}")
except Exception as e:
    check("CORS preflight /inference/predict", False, str(e))

# Summary
print()
print("=" * 55)
passed = sum(1 for s, _, _ in results if s == "PASS")
failed = sum(1 for s, _, _ in results if s == "FAIL")
print(f"  RESULT: {passed} passed, {failed} failed out of {len(results)} checks")
if failed == 0:
    print("  STATUS: SYSTEM FULLY OPERATIONAL")
elif failed <= 2:
    print("  STATUS: SYSTEM OPERATIONAL WITH MINOR ISSUES")
else:
    print("  STATUS: SYSTEM DEGRADED — ACTION REQUIRED")
print("=" * 55)
