
import asyncio
import httpx

async def test_signup():
    async with httpx.AsyncClient() as client:
        # Generate a unique username
        import time
        username = f"testuser_{int(time.time())}"
        payload = {
            "username": username,
            "password": "Password123",
            "full_name": "Test User",
            "role": "patient",
            "age": 25,
            "gender": "Male",
            "height": 175.0,
            "weight": 70.0,
            "smoking_status": "Never",
            "activity_level": "Moderate"
        }
        
        print(f"Testing signup for {username}...")
        response = await client.post("http://127.0.0.1:8000/auth/signup", json=payload)
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")

if __name__ == "__main__":
    asyncio.run(test_signup())
