import asyncio
import os
import sys

from app.core.database import get_db

async def main():
    try:
        supabase = get_db()
        # To get the schema, we can try to insert a garbage row and parse the error
        # Or we can query the 'risk_predictions' with limit=1 to see what columns come back
        res = supabase.table("risk_predictions").select("*").limit(1).execute()
        print("COLUMNS:", res.data[0].keys() if res.data else "EMPTY DATA")
    except Exception as e:
        print("ERROR:", e)

    # Let's also check breath_tests
    try:
        supabase = get_db()
        res2 = supabase.table("breath_tests").select("*").limit(1).execute()
        print("BREATH COLUMNS:", res2.data[0].keys() if res2.data else "EMPTY DATA")
    except Exception as e:
        print("BREATH ERROR:", e)

if __name__ == "__main__":
    asyncio.run(main())
