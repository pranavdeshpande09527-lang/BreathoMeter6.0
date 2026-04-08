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

async def check_rate_limit(request: Request, limit: int = 5, window_seconds: int = 60):
    """
    Sliding window rate limit implementation.
    Limits to `limit` requests per `window_seconds` per IP.
    Raises HTTPException 429 if the limit is exceeded.
    """
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    
    async with _lock:
        # Get request history for this IP
        history = _rate_limit_store[client_ip]
        
        # Filter out old requests outside the sliding window
        window_start = now - window_seconds
        history = [ts for ts in history if ts > window_start]
        
        # Check limit
        if len(history) >= limit:
            _rate_limit_store[client_ip] = history # Update store with cleaned history anyway
            app_logger.warning(f"Rate limit exceeded for IP: {client_ip} on path: {request.url.path}")
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please wait before trying again."
            )
            
        # Add new request
        history.append(now)
        _rate_limit_store[client_ip] = history
