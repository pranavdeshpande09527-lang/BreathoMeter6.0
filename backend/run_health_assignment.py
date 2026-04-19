"""
run_health_assignment.py
========================
Submits the health assignment (inference/predict) to the deployed
Breathometer backend MULTIPLE TIMES with diverse patient data, and
prints a clean, colour-coded results table.

Run:
    python run_health_assignment.py
"""

import requests
import json
import time
import uuid
import sys

# Force UTF-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE = "https://breathometer6-0.onrender.com"

# ── ANSI colours ──────────────────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def banner(text):
    print(f"\n{BOLD}{CYAN}{'='*60}{RESET}")
    print(f"{BOLD}{CYAN}  {text}{RESET}")
    print(f"{BOLD}{CYAN}{'='*60}{RESET}")

def ok(msg):   print(f"  {GREEN}[OK] {msg}{RESET}")
def err(msg):  print(f"  {RED}[FAIL] {msg}{RESET}")
def info(msg): print(f"  {YELLOW}[INFO] {msg}{RESET}")

# ── STEP 1: Sign up a fresh temp user & get token ────────────────────────────
banner("STEP 1 — Authenticate (signup + login)")

username = f"qa_{uuid.uuid4().hex[:10]}"
password = "HealthTest@2026"

signup_payload = {
    "username":       username,
    "password":       password,
    "full_name":      "QA Health Runner",
    "role":           "patient",
    "age":            30,
    "gender":         "Male",
    "height":         175,
    "weight":         70,
    "smoking_status": "Never",
    "activity_level": "Moderate"
}

token = None

# --- signup ---
print(f"  Signing up as: {username}")
try:
    r = requests.post(f"{BASE}/auth/signup", json=signup_payload, timeout=60)
    info(f"Signup status: {r.status_code}")
    if r.status_code in (200, 201):
        token = r.json().get("session", {}).get("access_token")
        if token:
            ok("Token obtained via signup")
        else:
            info("Signup succeeded but no token in response — trying login …")
    else:
        info(f"Signup response: {r.text[:200]}")
except Exception as e:
    err(f"Signup failed: {e}")

# --- login fallback ---
if not token:
    try:
        r = requests.post(
            f"{BASE}/auth/login",
            json={"username": username, "password": password},
            timeout=60,
        )
        info(f"Login status: {r.status_code}")
        if r.status_code == 200:
            token = r.json().get("session", {}).get("access_token")
            if token:
                ok("Token obtained via login")
    except Exception as e:
        err(f"Login failed: {e}")

if not token:
    err("Could not obtain auth token — aborting.")
    sys.exit(1)

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type":  "application/json",
}

# ── STEP 2: Define 5 diverse health assignments ───────────────────────────────
banner("STEP 2 — Health Assignment Payloads")

CASES = [
    {
        "label": "Case 1 — Young Male, Moderate AQI, Smoker",
        "payload": {
            "environmental_data": {
                "AQI": 120, "PM10": 65, "PM2_5": 35, "NO2": 25,
                "SO2": 8, "O3": 45, "Temperature": 28, "Humidity": 55,
                "WindSpeed": 3, "RespiratoryCases": 8,
                "CardiovascularCases": 4, "HospitalAdmissions": 2,
                "HealthImpactScore": 60
            },
            "optional_patient_data": {
                "age": 25, "gender": "Male",
                "symptoms": "Occasional cough, mild breathlessness after exercise",
                "medical_history": "None",
                "lifestyle": {"smoking_habits": "Current", "outdoor_time_hours": 3}
            }
        }
    },
    {
        "label": "Case 2 — Middle-aged Female, High AQI, Non-smoker",
        "payload": {
            "environmental_data": {
                "AQI": 200, "PM10": 110, "PM2_5": 75, "NO2": 50,
                "SO2": 20, "O3": 60, "Temperature": 35, "Humidity": 70,
                "WindSpeed": 1, "RespiratoryCases": 20,
                "CardiovascularCases": 10, "HospitalAdmissions": 6,
                "HealthImpactScore": 90
            },
            "optional_patient_data": {
                "age": 42, "gender": "Female",
                "symptoms": "Persistent dry cough, chest tightness, eye irritation",
                "medical_history": "Mild hypertension",
                "lifestyle": {"smoking_habits": "Never", "outdoor_time_hours": 6}
            }
        }
    },
    {
        "label": "Case 3 — Senior Male, Very High AQI, Ex-smoker, Asthma",
        "payload": {
            "environmental_data": {
                "AQI": 300, "PM10": 170, "PM2_5": 120, "NO2": 80,
                "SO2": 35, "O3": 75, "Temperature": 38, "Humidity": 80,
                "WindSpeed": 0.5, "RespiratoryCases": 40,
                "CardiovascularCases": 22, "HospitalAdmissions": 15,
                "HealthImpactScore": 95
            },
            "optional_patient_data": {
                "age": 67, "gender": "Male",
                "symptoms": "Severe wheezing, chronic productive cough, dyspnea at rest",
                "medical_history": "COPD, Asthma, Type 2 Diabetes",
                "lifestyle": {"smoking_habits": "Former", "outdoor_time_hours": 2}
            }
        }
    },
    {
        "label": "Case 4 — Young Female, Clean Air, No symptoms",
        "payload": {
            "environmental_data": {
                "AQI": 30, "PM10": 15, "PM2_5": 8, "NO2": 5,
                "SO2": 2, "O3": 20, "Temperature": 22, "Humidity": 40,
                "WindSpeed": 5, "RespiratoryCases": 1,
                "CardiovascularCases": 0, "HospitalAdmissions": 0,
                "HealthImpactScore": 10
            },
            "optional_patient_data": {
                "age": 22, "gender": "Female",
                "symptoms": "No symptoms",
                "medical_history": "None",
                "lifestyle": {"smoking_habits": "Never", "outdoor_time_hours": 1}
            }
        }
    },
    {
        "label": "Case 5 — Middle-aged Male, Moderate AQI, Cardiovascular history",
        "payload": {
            "environmental_data": {
                "AQI": 155, "PM10": 85, "PM2_5": 55, "NO2": 40,
                "SO2": 15, "O3": 50, "Temperature": 32, "Humidity": 65,
                "WindSpeed": 2, "RespiratoryCases": 12,
                "CardiovascularCases": 8, "HospitalAdmissions": 4,
                "HealthImpactScore": 78
            },
            "optional_patient_data": {
                "age": 55, "gender": "Male",
                "symptoms": "Shortness of breath, chest pain on exertion, fatigue",
                "medical_history": "Coronary artery disease, Hypertension, High cholesterol",
                "lifestyle": {"smoking_habits": "Former", "outdoor_time_hours": 4}
            }
        }
    }
]

# ── STEP 3: Submit all cases ───────────────────────────────────────────────────
banner("STEP 3 — Submitting Health Assignments to Deployed Backend")

ENDPOINT = f"{BASE}/inference/predict"
all_results = []

for i, case in enumerate(CASES, 1):
    print(f"\n{BOLD}[{i}/5] {case['label']}{RESET}")
    print(f"  → POST {ENDPOINT}")
    start = time.time()
    try:
        resp = requests.post(ENDPOINT, json=case["payload"], headers=headers, timeout=90)
        elapsed = time.time() - start
        status = resp.status_code

        if status == 200:
            data = resp.json()
            ok(f"HTTP {status}  ({elapsed:.1f}s)")

            # Extract key fields
            risk    = data.get("risk_level") or data.get("risk_category") or "—"
            score   = data.get("health_impact_score") or data.get("ml_prediction", {}).get("health_risk_score") or "—"
            ai_text = (
                data.get("ai_analysis") or
                data.get("health_insights") or
                data.get("analysis") or
                "No AI text in response"
            )
            if isinstance(ai_text, dict):
                ai_text = json.dumps(ai_text, indent=2)

            print(f"  {CYAN}Risk Level   :{RESET} {risk}")
            print(f"  {CYAN}Health Score :{RESET} {score}")
            print(f"  {CYAN}AI Analysis  :{RESET}")
            # Print first 500 chars of AI text
            preview = str(ai_text)[:500]
            for line in preview.split("\n"):
                print(f"      {line}")
            if len(str(ai_text)) > 500:
                print(f"      … [{len(str(ai_text)) - 500} more chars]")

            all_results.append({
                "case": case["label"],
                "status": "PASS",
                "http": status,
                "elapsed_s": round(elapsed, 1),
                "risk_level": risk,
                "health_score": score,
                "ai_preview": str(ai_text)[:300],
            })
        else:
            err(f"HTTP {status}  ({elapsed:.1f}s)")
            try:
                detail = resp.json()
            except Exception:
                detail = resp.text[:300]
            print(f"  Body: {detail}")
            all_results.append({
                "case": case["label"],
                "status": "FAIL",
                "http": status,
                "elapsed_s": round(elapsed, 1),
                "error": str(detail)[:200],
            })

    except requests.exceptions.Timeout:
        err("Request TIMED OUT (>90 s)")
        all_results.append({"case": case["label"], "status": "TIMEOUT", "http": "—", "elapsed_s": 90})
    except Exception as e:
        err(f"Exception: {e}")
        all_results.append({"case": case["label"], "status": "ERROR", "http": "—", "elapsed_s": 0, "error": str(e)})

    time.sleep(1)  # polite gap between submissions

# ── STEP 4: Summary table ─────────────────────────────────────────────────────
banner("RESULTS SUMMARY")

passed  = sum(1 for r in all_results if r["status"] == "PASS")
failed  = sum(1 for r in all_results if r["status"] != "PASS")
total   = len(all_results)

col_w = 45
print(f"\n  {'#':<3} {'Case':<{col_w}} {'Status':<8} {'HTTP':<6} {'Time':>6}  Risk")
print(f"  {'-'*3} {'-'*col_w} {'-'*8} {'-'*6} {'-'*6}  ----")
for i, r in enumerate(all_results, 1):
    st_col = GREEN if r["status"] == "PASS" else RED
    label  = r["case"][:col_w]
    risk   = r.get("risk_level", "—")
    print(
        f"  {i:<3} {label:<{col_w}} "
        f"{st_col}{r['status']:<8}{RESET} "
        f"{str(r['http']):<6} "
        f"{str(r.get('elapsed_s','—')):>5}s  {risk}"
    )

print()
print(f"  {BOLD}Total: {total}  |  Passed: {GREEN}{passed}{RESET}{BOLD}  |  Failed: {RED}{failed}{RESET}")

if passed == total:
    print(f"\n  {GREEN}{BOLD}*** ALL HEALTH ASSIGNMENTS SUBMITTED & PROCESSED SUCCESSFULLY! ***{RESET}")
elif passed > 0:
    print(f"\n  {YELLOW}{BOLD}[WARNING] PARTIAL SUCCESS -- {passed}/{total} assignments processed.{RESET}")
else:
    print(f"\n  {RED}{BOLD}[ERROR] ALL SUBMISSIONS FAILED -- Check auth or endpoint.{RESET}")

print(f"\n{BOLD}{CYAN}{'='*60}{RESET}\n")

# ── Save raw results ──────────────────────────────────────────────────────────
with open("health_assignment_results.json", "w") as f:
    json.dump(all_results, f, indent=2)
print(f"  Full results saved → health_assignment_results.json\n")
