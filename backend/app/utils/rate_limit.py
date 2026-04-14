import time
from fastapi import HTTPException, Request
from collections import defaultdict
import asyncio

from app.utils.logger import app_logger

# Store requests locally: { "ip_address": [timestamp1, timestamp2, ...] }
# For a production application scaling horizontally, use Redis. 
# This in-memory store works well for single-instance deployments.
_rate_limit_store = defaultdict(list)
_lock = asyncio.Lock()

def _rate_limit_key(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    client_ip = forwarded_for.split(",")[0].strip() if forwarded_for else (request.client.host if request.client else "unknown")
    auth_header = request.headers.get("authorization", "")
    auth_fingerprint = auth_header[-12:] if auth_header.lower().startswith("bearer ") else "anon"
    return f"{request.url.path}:{client_ip}:{auth_fingerprint}"

async def check_rate_limit(request: Request, limit: int = 5, window_seconds: int = 60):
    """
    Sliding window rate limit implementation.
    Limits to `limit` requests per `window_seconds` per IP.
    Raises HTTPException 429 if the limit is exceeded.
    """
    rate_key = _rate_limit_key(request)
    now = time.time()
    
    async with _lock:
        # Get request history for this IP
        history = _rate_limit_store[rate_key]
        
        # Filter out old requests outside the sliding window
        window_start = now - window_seconds
        history = [ts for ts in history if ts > window_start]
        
        # Check limit
        if len(history) >= limit:
            _rate_limit_store[rate_key] = history # Update store with cleaned history anyway
            app_logger.warning(f"Rate limit exceeded for key: {rate_key}")
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please wait before trying again."
            )
            
        # Add new request
        history.append(now)
        _rate_limit_store[rate_key] = history
