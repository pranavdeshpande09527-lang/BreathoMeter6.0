import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.abspath('backend'))
from app.database import supabase_admin_auth_request

async def run():
    res = await supabase_admin_auth_request('users', 'GET')
    users = res.get('users', [])
    sarah_users = [u for u in users if 'Sarah' in str(u)]
    print(json.dumps(sarah_users, indent=2))

if __name__ == "__main__":
    asyncio.run(run())
