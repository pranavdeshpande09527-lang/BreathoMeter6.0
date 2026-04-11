import asyncio
import os
from dotenv import load_dotenv

# load environment
load_dotenv(".env")
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

import httpx

async def main():
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{supabase_url}/rest/v1/users?select=*&id=eq.b40c24b6-acda-416f-bc69-38ebb670288f",
            headers={
                "apikey": supabase_key,
                "Authorization": f"Bearer {supabase_key}"
            }
        )
        import pprint
        pprint.pprint(res.json())

        # Try to execute a query against pg_policies if we have a view or RPC for it
        # Actually, let's just log in as user if we have a way. We don't have their password.
        
if __name__ == "__main__":
    asyncio.run(main())