import sys
import os
# Add current directory to path to ensure 'app' is found correctly
sys.path.append(os.getcwd())

print(f"Current Working Directory: {os.getcwd()}")
print(f"Python sys.path: {sys.path[:5]}") # Print first few entries

try:
    import app.database
    print(f"Successfully imported app.database from: {app.database.__file__}")
    print(f"Direct attributes: {dir(app.database)}")
    
    if hasattr(app.database, 'supabase_auth_request'):
        print("SUCCESS: supabase_auth_request FOUND in app.database")
    else:
        print("FAILURE: supabase_auth_request NOT FOUND in app.database")
        # Let's read the file content at runtime to be absolutely sure
        with open(app.database.__file__, 'r') as f:
            lines = f.readlines()
            found = False
            for i, line in enumerate(lines):
                if 'def supabase_auth_request' in line:
                    print(f"Found definition in source at line {i+1}: {line.strip()}")
                    found = True
            if not found:
                print("Could not find 'def supabase_auth_request' string in the source file!")

except ImportError as e:
    print(f"ImportError while importing app.database: {e}")
except Exception as e:
    print(f"General Exception: {e}")

try:
    from app.core import dependencies
    print("app.core.dependencies imported successfully")
except ImportError as e:
    print(f"dependencies ImportError: {e}")
except Exception as e:
    print(f"dependencies Exception: {e}")
