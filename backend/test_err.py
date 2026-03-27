import traceback
try:
    from app.main import app
except Exception:
    with open('log_err.txt', 'w') as f:
        traceback.print_exc(file=f)
