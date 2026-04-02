import sys
import os
sys.path.append(os.getcwd())

try:
    from app.database import supabase_auth_request
    print(f"Success! Imported supabase_auth_request: {supabase_auth_request}")
except ImportError as e:
    print(f"ImportError: {e}")
    import app.database
    print(f"app.database attributes: {dir(app.database)}")
except Exception as e:
    print(f"Exception: {e}")

try:
    from app.core import dependencies
    print("app.core.dependencies imported successfully")
except ImportError as e:
    print(f"dependencies ImportError: {e}")
except Exception as e:
    print(f"dependencies Exception: {e}")
