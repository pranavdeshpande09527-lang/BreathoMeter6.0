import os
import urllib.request
import urllib.error
import json
from dotenv import load_dotenv  # type: ignore

load_dotenv()
url: str = os.environ.get("SUPABASE_URL") or ""
key: str = os.environ.get("SUPABASE_KEY") or ""

payload = {
    "user_id": "00000000-0000-0000-0000-000000000000",
    "final_risk_score": 0.5,
    "risk_category": "Low Risk",
    "ai_explanation": "Test explanation",
    "top_risk_factors": ["Test Factor 1", "Test Factor 2"],
    "non_existent_column_123": True
}

try:
    req = urllib.request.Request(
        f"{url}/rest/v1/risk_predictions",
        data=json.dumps(payload).encode(),
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        },
        method="POST"
    )
    with urllib.request.urlopen(req) as response:
        print("Success:", response.read().decode())
except urllib.error.HTTPError as e:
    print(f"HTTP {e.code}: {e.read().decode()}")
