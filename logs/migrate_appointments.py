import json
import asyncio
import httpx
import os
import sys

# Standard Supabase REST POST with Service Role Key
# These will be fetched from env if available, or I'll just hardcode from what I know.

SUPABASE_URL = "https://vgfodjbaoqngncifhqic.supabase.co"
# Need to get SERVICE_ROLE_KEY. I could try to grep it from .env or config.

def get_service_key():
    # Try looking in .env in the root or backend root
    for path in ['.env', 'backend/.env', 'backend/app/.env']:
        if os.path.exists(path):
            with open(path, 'r') as f:
                for line in f:
                    if 'SUPABASE_SERVICE_ROLE_KEY' in line:
                        return line.split('=')[1].strip().strip('"').strip("'")
    return None

async def migrate():
    KEY = get_service_key()
    if not KEY:
        print("COULD NOT FIND SERVICE ROLE KEY in .env files.")
        return

    print("Loading data from appointments.json...")
    with open('backend/appointments.json', 'r') as f:
        data = json.load(f)
        
    print(f"Found {len(data)} appointments. Processing...")
    
    headers = {
        "apikey": KEY,
        "Authorization": f"Bearer {KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    url = f"{SUPABASE_URL}/rest/v1/appointments"
    
    async with httpx.AsyncClient() as client:
        # Check if they exist first to avoid duplicates
        for app in data:
            # Prepare payload
            payload = {
                "id": app["id"],
                "patient_id": app["patient_id"],
                "doctor_id": app["doctor_id"],
                "patient_name": app["patient_name"],
                "disease": app["disease"],
                "status": app["status"],
                "messages": app.get("messages", []),
                "created_at": app["created_at"]
            }
            
            # Use UPSERT using 'id'
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code >= 400:
                print(f"Failed to migrate {app['id']}: {response.text}")
            else:
                print(f"Migrated {app['id']} successfully.")

if __name__ == "__main__":
    asyncio.run(migrate())
