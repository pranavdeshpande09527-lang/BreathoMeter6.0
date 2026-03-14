import os
import sys
from dotenv import load_dotenv  # type: ignore

load_dotenv()

from supabase import create_client, Client  # type: ignore

url: str = os.environ.get("SUPABASE_URL") or ""
key: str = os.environ.get("SUPABASE_KEY") or ""

supabase: Client = create_client(url, key)

try:
    print("Fetching one row to check schema:")
    res = supabase.table("risk_predictions").select("*").limit(1).execute()
    print("Row data:", res.data)
except Exception as e:
    print("Select error:", e)

try:
    print("\nAttempting raw insert (without user_id if we don't have one, or just checking if error provides detail):")
    # Using a fake UUID for user_id
    res = supabase.table("risk_predictions").insert({
        "user_id": "00000000-0000-0000-0000-000000000000",
        "final_risk_score": 0.5,
        "predicted_condition": "Low Risk",
        "risk_category": "Low Risk",
        "ai_explanation": "Test explanation",
        "top_risk_factors": ["Test Factor 1", "Test Factor 2"]
    }).execute()
    print("Insert success:", res.data)
except Exception as e:
    print("Insert error:")
    print(getattr(e, 'message', str(e)))
    details = getattr(e, 'details', None)
    if details: print(details)
    hint = getattr(e, 'hint', None)
    if hint: print(hint)
    
