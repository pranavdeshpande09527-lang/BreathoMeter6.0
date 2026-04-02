import os
import httpx
import asyncio

URL = os.environ.get("SUPABASE_URL", "https://vgfodjbaoqngncifhqic.supabase.co")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnZm9kamJhb3FuZ25jaWZocWljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjczMjU0NiwiZXhwIjoyMDg4MzA4NTQ2fQ.GLyH65fn5e-47eB9h5a2RzoTkkV-HaDDoa_7orNxKYk")

async def test():
    headers = {
        "apikey": KEY,
        "Authorization": f"Bearer {KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    payload = {
        "user_id": "b40c24b6-acda-416f-bc69-38ebb670288f",
        "final_risk_score": 85.0,
        "predicted_condition": "High Risk",
        "risk_category": "High Risk",
        "ai_explanation": "Test explanation",
        "top_risk_factors": ["Smoking", "Age"],
        "disease_risks": [{"disease": "COPD", "risk_tier": "High Risk", "percentage": 85.0}]
    }

    async with httpx.AsyncClient() as client:
        res = await client.post(f"{URL}/rest/v1/risk_predictions", headers=headers, json=payload)
        print("Status code:", res.status_code)
        print("Response body:", res.text)

asyncio.run(test())
