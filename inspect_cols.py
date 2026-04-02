import pandas as pd
import json
import os

files = [
    r"c:\Users\prana\.antigravity\breathomeater4.0\BreathoMeter5.0\maharashtra_doctors_enriched.xlsx",
    r"C:\Users\prana\.antigravity\doctors_dataset_maharashtra_v3.xlsx"
]

report = {}

for f in files:
    if os.path.exists(f):
        df = pd.read_excel(f)
        report[f] = df.columns.tolist()

print(json.dumps(report, indent=2))
