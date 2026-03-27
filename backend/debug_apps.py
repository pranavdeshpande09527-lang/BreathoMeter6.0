import json
import os

APPOINTMENTS_FILE = "appointments.json"

def load():
    if not os.path.exists(APPOINTMENTS_FILE):
        return []
    with open(APPOINTMENTS_FILE, "r") as f:
        return json.load(f)

apps = load()
print(f"Total appointments in file: {len(apps)}")
for a in apps:
    print(f"ID: {a['id']}, Patient: {a['patient_name']}, Doctor ID: {a['doctor_id']}, Status: {a['status']}")
