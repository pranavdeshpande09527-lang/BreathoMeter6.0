import asyncio
import httpx
import json

async def main():
    base_url = "http://127.0.0.1:8000"
    async with httpx.AsyncClient(timeout=30) as client:
        # 1. Login
        resp = await client.post(f"{base_url}/auth/login", json={"username": "pranav", "password": "Pr@131006"})
        data = resp.json()
        token = data.get("session", {}).get("access_token")
        user_id = data.get("session", {}).get("user", {}).get("id")
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Get history
        hist_resp = await client.get(f"{base_url}/prediction/{user_id}", headers=headers)
        hist = hist_resp.json()
        print(f"Status: {hist_resp.status_code}")
        print(f"Num records: {len(hist)}")
        if hist:
            latest = hist[0]
            print("Latest record disease_risks:", type(latest.get("disease_risks")), latest.get("disease_risks"))
            print("Latest record primary_prediction:", latest.get("primary_prediction"))
            with open("hist_output.json", "w") as f:
                json.dump(latest, f, indent=2)

if __name__ == "__main__":
    asyncio.run(main())
