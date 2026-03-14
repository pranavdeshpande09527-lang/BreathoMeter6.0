import os
from typing import Optional
from supabase import create_client, Client, ClientOptions
from dotenv import load_dotenv

load_dotenv()

class Database:
    _instance: Client = None

    @classmethod
    def get_client(cls, token: Optional[str] = None) -> Client:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables")
            
        # If no token is provided, we can use the singleton for performance
        if token is None:
            if cls._instance is None:
                cls._instance = create_client(supabase_url, supabase_key)
            return cls._instance
        
        # If a token is provided, we create a new client and inject the token explicitly
        # This properly authenticates PostgREST for RLS
        client = create_client(supabase_url, supabase_key)
        client.postgrest.auth(token)
        return client

# Helper function for anonymous or global operations
def get_db() -> Client:
    return Database.get_client()
