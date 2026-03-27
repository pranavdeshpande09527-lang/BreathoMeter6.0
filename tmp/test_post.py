import asyncio
import httpx
import json

async def test_request():
    url = "https://vgfodjbaoqngncifhqic.supabase.co/rest/v1/appointments"
    key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnZm9kamJhb3FuZ25jaWZocWljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjczMjU0NiwiZXhwIjoyMDg4MzA4NTQ2fQ.GLyH65fn5e-47eB9h5a2RzoTkkV-HaDDoa_7orNxKYk"
    
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    payload = {
        "patient_id": "aeb0b34d-9f5e-47c3-838f-03f445597dbc",
        "patient_name": "Antigravity Test",
        "doctor_id": "9a472251-ef4d-493a-b9d1-0896e4a48718",
        "disease": "Testing Reflection",
        "status": "pending",
        "messages": []
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")

if __name__ == "__main__":
    asyncio.run(test_request())
