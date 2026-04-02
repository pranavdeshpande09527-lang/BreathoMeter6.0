import sys
import os
sys.path.append(os.getcwd())

with open("diagnostic.log", "w") as log:
    log.write(f"Current Working Directory: {os.getcwd()}\n")
    log.write(f"Python sys.path: {sys.path[:5]}\n")

    try:
        import app.database
        log.write(f"Successfully imported app.database from: {app.database.__file__}\n")
        log.write(f"Direct attributes: {dir(app.database)}\n")
        
        if hasattr(app.database, 'supabase_auth_request'):
            log.write("SUCCESS: supabase_auth_request FOUND in app.database\n")
        else:
            log.write("FAILURE: supabase_auth_request NOT FOUND in app.database\n")
            with open(app.database.__file__, 'r') as f:
                lines = f.readlines()
                for i, line in enumerate(lines):
                    if 'def supabase_auth_request' in line:
                        log.write(f"Found definition in source at line {i+1}: {line.strip()}\n")
    except ImportError as e:
        log.write(f"ImportError while importing app.database: {e}\n")

    try:
        from app.core import dependencies
        log.write("app.core.dependencies imported successfully\n")
    except ImportError as e:
        log.write(f"dependencies ImportError: {e}\n")

print("Diagnostic complete. Check diagnostic.log")
