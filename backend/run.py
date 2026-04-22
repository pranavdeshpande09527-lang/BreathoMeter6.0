import os
import uvicorn

if __name__ == "__main__":
    # Render provides the PORT environment variable
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting uvicorn on 0.0.0.0:{port}...")
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        proxy_headers=True,
        forwarded_allow_ips="*"
    )
