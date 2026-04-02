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
        try:
            df = pd.read_excel(f)
            report[f] = {
                "columns": df.columns.tolist(),
                "head": df.head(3).to_dict(orient='records'),
                "count": len(df)
            }
        except Exception as e:
            report[f] = {"error": str(e)}
    else:
        report[f] = {"error": "File not found"}

print(json.dumps(report, indent=2))
