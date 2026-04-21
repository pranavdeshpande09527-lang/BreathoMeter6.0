import requests
import time
import os

FRONTEND_URL = "https://breathometer6.web.app/"
BACKEND_URL = "https://breathometer6-0.onrender.com"
RESULTS = []

def log_result(phase, test_name, success, info=""):
    status = "PASS" if success else "FAIL"
    RESULTS.append(f"{phase} | {status} | {test_name} {f'({info})' if info else ''}")
    print(RESULTS[-1])

def test_smoke():
    print("--- Phase 1: Smoke Testing ---")
    try:
        start = time.time()
        r = requests.get(FRONTEND_URL, timeout=10)
        ttfb = time.time() - start
        log_result("Smoke", "Frontend Load", r.status_code == 200, f"Time: {ttfb:.2f}s")
    except Exception as e:
        log_result("Smoke", "Frontend Load", False, str(e))
        
    try:
        start = time.time()
        r = requests.get(f"{BACKEND_URL}/", timeout=10)
        ttfb = time.time() - start
        log_result("Smoke", "Backend Load", r.status_code == 200, f"Time: {ttfb:.2f}s")
    except Exception as e:
        log_result("Smoke", "Backend Load", False, str(e))

def test_auth_security():
    print("--- Phase 2: Security & Auth ---")
    try:
        r = requests.get(f"{BACKEND_URL}/auth/profile", timeout=10)
        # Should be blocked without token
        log_result("Security", "Missing JWT Blocked", r.status_code in [401, 403], f"Status: {r.status_code}")
    except Exception as e:
        log_result("Security", "Missing JWT Blocked", False, str(e))
        
    try:
        r = requests.post(f"{BACKEND_URL}/inference/predict?expand=true", json={}, timeout=10)
        # Should be blocked without token
        log_result("Security", "ML Endpoint Protected", r.status_code in [401, 403], f"Status: {r.status_code}")
    except Exception as e:
        log_result("Security", "ML Endpoint Protected", False, str(e))

def test_api_validation():
    print("--- Phase 3: API Validation ---")
    # Try signup with bad email
    try:
        r = requests.post(f"{BACKEND_URL}/auth/signup", json={"username": "not_an_email", "password": "123", "full_name": ""}, timeout=10)
        log_result("API", "Bad Payload Validation", r.status_code in [422, 400], f"Status: {r.status_code}")
    except Exception as e:
        log_result("API", "Bad Payload Validation", False, str(e))

def test_performance():
    print("--- Phase 5: Performance Test ---")
    times = []
    successes = 0
    try:
        for _ in range(5):
            start = time.time()
            r = requests.get(f"{BACKEND_URL}/system-status", timeout=10)
            if r.status_code == 200:
                successes += 1
            times.append(time.time() - start)
        
        avg_time = sum(times) / len(times)
        log_result("Perf", "5x System Status Check", successes == 5, f"Avg Time: {avg_time:.2f}s")
    except Exception as e:
        log_result("Perf", "5x System Status Check", False, str(e))

if __name__ == "__main__":
    test_smoke()
    test_auth_security()
    test_api_validation()
    test_performance()
    
    print("\n\n=== FINAL PRE-LAUNCH TEST RESULTS ===")
    for r in RESULTS:
        print(r)
