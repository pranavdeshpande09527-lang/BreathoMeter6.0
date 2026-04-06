import httpx
import time
import hashlib
import json
import logging
from app.config import settings
from typing import Optional, Dict, Any, List, Union

logger = logging.getLogger("breathometer.db")

# ---------------------------------------------------------------------------
# Supabase base configuration
# ---------------------------------------------------------------------------
SUPABASE_URL = settings.supabase_url
SUPABASE_KEY = settings.supabase_key
SUPABASE_SERVICE_ROLE_KEY = settings.supabase_service_role_key

# ---------------------------------------------------------------------------
# Shared persistent HTTP clients (connection pooling)
# Created once at startup, reused across all requests.
# This eliminates TCP/TLS handshake overhead (~100-500 ms) on every DB call.
# ---------------------------------------------------------------------------
_anon_client: Optional[httpx.AsyncClient] = None
_admin_client: Optional[httpx.AsyncClient] = None
_auth_client: Optional[httpx.AsyncClient] = None
_admin_auth_client: Optional[httpx.AsyncClient] = None

# Default headers for PostgREST requests
_ANON_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

_ADMIN_HEADERS = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


def _make_limits() -> httpx.Limits:
    """Connection pool limits: keep-alive connections for reuse."""
    return httpx.Limits(
        max_connections=20,
        max_keepalive_connections=10,
        keepalive_expiry=30,
    )


async def init_db_clients():
    """Call this ONCE at application startup (lifespan or startup event)."""
    global _anon_client, _admin_client, _auth_client, _admin_auth_client
    limits = _make_limits()
    _anon_client = httpx.AsyncClient(timeout=15.0, limits=limits)
    _admin_client = httpx.AsyncClient(timeout=15.0, limits=limits)
    _auth_client = httpx.AsyncClient(timeout=15.0, limits=limits)
    _admin_auth_client = httpx.AsyncClient(timeout=15.0, limits=limits)
    # Critical: log key presence so we can diagnose auth failures from logs
    key_status = "SET ✓" if SUPABASE_SERVICE_ROLE_KEY else "MISSING ✗"
    logger.info(f"Supabase HTTP connection pools initialised. SERVICE_ROLE_KEY: {key_status}")


async def close_db_clients():
    """Call this ONCE at application shutdown."""
    for client in [_anon_client, _admin_client, _auth_client, _admin_auth_client]:
        if client:
            await client.aclose()
    logger.info("Supabase HTTP connection pools closed.")


# ---------------------------------------------------------------------------
# Simple in-process cache for read-heavy, rarely-changing data
# ---------------------------------------------------------------------------
_cache: Dict[str, Any] = {}
_CACHE_TTL = 60  # seconds — adjust per use-case


def _cache_key(table: str, params: Optional[Dict]) -> str:
    raw = f"{table}:{json.dumps(params or {}, sort_keys=True)}"
    return hashlib.md5(raw.encode()).hexdigest()


def _cache_get(key: str) -> Optional[Any]:
    entry = _cache.get(key)
    if entry and (time.monotonic() - entry["ts"]) < _CACHE_TTL:
        return entry["data"]
    return None


def _cache_set(key: str, data: Any):
    _cache[key] = {"data": data, "ts": time.monotonic()}


def invalidate_cache(table: Optional[str] = None):
    """
    Bust the whole cache, or only entries for a specific table prefix.
    Call after any write (POST/PATCH/DELETE) to keep data fresh.
    """
    if table is None:
        _cache.clear()
    else:
        for k in list(_cache.keys()):
            if k.startswith(table):
                del _cache[k]


# ---------------------------------------------------------------------------
# Core request helpers
# ---------------------------------------------------------------------------

async def supabase_request(
    table: str,
    method: str = "GET",
    data: Optional[Dict[str, Any]] = None,
    query_params: Optional[Dict[str, str]] = None,
    token: Optional[str] = None,
    use_cache: bool = False,
) -> Union[List[Dict], Dict, None]:
    """
    Unified HTTP helper to interact with Supabase PostgREST tables.
    Uses a persistent connection pool to avoid per-request TCP/TLS overhead.

    Args:
        use_cache: When True and method is GET, results are cached for
                   CACHE_TTL seconds. Set this only for relatively static data
                   (e.g. doctor lists, city lists).
    """
    if _anon_client is None:
        raise RuntimeError("DB clients not initialised — call init_db_clients() at startup.")

    # --- Cache check (GET only) ---
    cache_key = _cache_key(table, query_params) if use_cache else None
    if use_cache and method == "GET":
        cached = _cache_get(cache_key)
        if cached is not None:
            logger.debug("Cache hit: %s", cache_key)
            return cached

    url = f"{SUPABASE_URL}/rest/v1/{table}"
    req_headers = _ANON_HEADERS.copy()
    if token:
        req_headers["Authorization"] = f"Bearer {token}"

    response = await _dispatch(_anon_client, method, url, req_headers, data, query_params)

    if response.status_code >= 400:
        raise Exception(f"DB Error {response.status_code}: {response.text}")

    result = response.json() if response.text.strip() else []

    # Store in cache on successful GET
    if use_cache and method == "GET" and cache_key:
        _cache_set(cache_key, result)

    # Bust cache on any write so stale data isn't served
    if method in ("POST", "PATCH", "DELETE"):
        invalidate_cache(table)

    return result


async def supabase_admin_request(
    table: str,
    method: str = "GET",
    data: Optional[Dict[str, Any]] = None,
    query_params: Optional[Dict[str, str]] = None,
    use_cache: bool = False,
) -> Union[List[Dict], Dict, None]:
    """
    Interacts with Supabase PostgREST using the Service Role Key to bypass RLS.
    Uses a dedicated persistent client.
    """
    if not SUPABASE_SERVICE_ROLE_KEY:
        raise Exception("SUPABASE_SERVICE_ROLE_KEY is required for admin operations.")

    if _admin_client is None:
        raise RuntimeError("DB clients not initialised — call init_db_clients() at startup.")

    cache_key = _cache_key(f"admin:{table}", query_params) if use_cache else None
    if use_cache and method == "GET":
        cached = _cache_get(cache_key)
        if cached is not None:
            return cached

    url = f"{SUPABASE_URL}/rest/v1/{table}"

    response = await _dispatch(_admin_client, method, url, _ADMIN_HEADERS, data, query_params)

    if response.status_code >= 400:
        raise Exception(f"Admin DB Error {response.status_code}: {response.text}")

    result = response.json() if response.text.strip() else []

    if use_cache and method == "GET" and cache_key:
        _cache_set(cache_key, result)
    if method in ("POST", "PATCH", "DELETE"):
        invalidate_cache(table)

    return result


async def supabase_auth_request(
    endpoint: str,
    method: str = "GET",
    data: Optional[Dict[str, Any]] = None,
    token: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Unified HTTP helper for Supabase GoTrue Auth operations.
    Uses a persistent connection pool.
    """
    if _auth_client is None:
        raise RuntimeError("DB clients not initialised — call init_db_clients() at startup.")

    url = f"{SUPABASE_URL}/auth/v1/{endpoint}"
    req_headers = {
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}" if token else f"Bearer {SUPABASE_KEY}",
    }

    response = await _dispatch(_auth_client, method, url, req_headers, data, None)

    if response.status_code >= 400:
        raise Exception(f"Auth Error {response.status_code}: {response.text}")

    return response.json()


async def supabase_admin_auth_request(
    endpoint: str,
    method: str = "POST",
    data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Interacts with Supabase GoTrue Auth Admin API.
    Requires Service Role Key. Uses a persistent connection pool.
    """
    if not SUPABASE_SERVICE_ROLE_KEY:
        raise Exception("SUPABASE_SERVICE_ROLE_KEY is required for admin auth operations.")

    if _admin_auth_client is None:
        raise RuntimeError("DB clients not initialised — call init_db_clients() at startup.")

    url = f"{SUPABASE_URL}/auth/v1/admin/{endpoint}"
    req_headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }

    response = await _dispatch(_admin_auth_client, method, url, req_headers, data, None)

    if response.status_code >= 400:
        raise Exception(f"Admin Auth Error {response.status_code}: {response.text}")

    return response.json()


# ---------------------------------------------------------------------------
# Internal dispatcher — keeps method-routing in one place
# ---------------------------------------------------------------------------

async def _dispatch(
    client: httpx.AsyncClient,
    method: str,
    url: str,
    headers: Dict[str, str],
    data: Optional[Dict],
    params: Optional[Dict],
) -> httpx.Response:
    method = method.upper()
    if method == "GET":
        return await client.get(url, headers=headers, params=params)
    elif method == "POST":
        return await client.post(url, headers=headers, json=data)
    elif method == "PATCH":
        return await client.patch(url, headers=headers, json=data, params=params)
    elif method == "DELETE":
        return await client.delete(url, headers=headers, params=params)
    elif method == "PUT":
        return await client.put(url, headers=headers, json=data)
    else:
        raise ValueError(f"HTTP method '{method}' is not supported.")
