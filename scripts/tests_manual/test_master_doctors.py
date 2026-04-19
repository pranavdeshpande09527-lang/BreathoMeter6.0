import json
import os
import sys

# Add backend to path 
sys.path.append(r"c:\Users\prana\.antigravity\breathomeater4.0\BreathoMeter5.0\backend")

from app.services.doctor_dataset import get_doctors

test_cases = [
    {"disease": "Asthma", "city": "Nagpur"},
    {"disease": "COPD", "city": "Pune"},
    {"disease": "Lung Cancer", "city": "Mumbai"},
    {"disease": "Bronchitis", "city": "Aurangabad"},
    {"disease": "Tuberculosis", "city": "Unknown City"} # Should expand to state
]

for tc in test_cases:
    print(f"\n--- Testing: {tc['disease']} in {tc['city']} ---")
    res = get_doctors(tc['disease'], tc['city'])
    print(f"Message: {res['message']}")
    print(f"Specialty: {res['specialty']}")
    print(f"Count: {len(res['doctors'])}")
    if res['doctors']:
        top = res['doctors'][0]
        print(f"Top Pick: {top['doctor_name']} ({top['specialty']}) at {top['hospital_name']}, Score: {top['score']:.2f}")
    else:
        print("NO DOCTORS FOUND")

print("\n--- Summary ---")
all_cities_count = len(set(d.get("City") for d in json.load(open(r"c:\Users\prana\.antigravity\breathomeater4.0\BreathoMeter5.0\maharashtra_doctors_master.json"))))
print(f"Dataset has doctors in {all_cities_count} cities.")
