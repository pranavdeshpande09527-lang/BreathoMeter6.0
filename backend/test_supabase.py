import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

def test_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    print(f"URL: {url}")
    print(f"KEY: {key[:10]}...")
    
    try:
        client = create_client(url, key)
        print("Client created successfully")
        # Try a simple select
        res = client.table("users").select("count", count="exact").limit(1).execute()
        print(f"Query successful: {res}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_client()
