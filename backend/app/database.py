import httpx
from app.config import settings
from typing import Optional, Dict, Any, List, Union

# Supabase REST and Auth base configurations
SUPABASE_URL = settings.supabase_url
SUPABASE_KEY = settings.supabase_key
SUPABASE_SERVICE_ROLE_KEY = settings.supabase_service_role_key

# Default headers specifically for PostgREST
headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

async def supabase_request(
    table: str,
    method: str = "GET",
    data: Optional[Dict[str, Any]] = None,
    query_params: Optional[Dict[str, str]] = None,
    token: Optional[str] = None
) -> Union[List[Dict], Dict, None]:
    """
    Unified HTTP helper to interact with Supabase PostgREST tables.
    Replaces the heavy supabase-py dependency for lightweight local execution.
    """
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    req_headers = headers.copy()
    if token:
        req_headers["Authorization"] = f"Bearer {token}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        if method == "GET":
            response = await client.get(url, headers=req_headers, params=query_params)
        elif method == "POST":
            response = await client.post(url, headers=req_headers, json=data)
        elif method == "PATCH":
            response = await client.patch(url, headers=req_headers, json=data, params=query_params)
        elif method == "DELETE":
            response = await client.delete(url, headers=req_headers, params=query_params)
        else:
            raise ValueError(f"Method {method} not supported.")

        if response.status_code >= 400:
            raise Exception(f"DB Error {response.status_code}: {response.text}")

        return response.json() if response.text.strip() else []

async def supabase_admin_request(
    table: str,
    method: str = "GET",
    data: Optional[Dict[str, Any]] = None,
    query_params: Optional[Dict[str, str]] = None
) -> Union[List[Dict], Dict, None]:
    """
    Interacts with Supabase PostgREST using the Service Role Key to bypass RLS.
    """
    if not SUPABASE_SERVICE_ROLE_KEY:
        raise Exception("SUPABASE_SERVICE_ROLE_KEY is required for admin operations.")

    url = f"{SUPABASE_URL}/rest/v1/{table}"
    req_headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        if method == "GET":
            response = await client.get(url, headers=req_headers, params=query_params)
        elif method == "POST":
            response = await client.post(url, headers=req_headers, json=data)
        elif method == "PATCH":
            response = await client.patch(url, headers=req_headers, json=data, params=query_params)
        elif method == "DELETE":
            response = await client.delete(url, headers=req_headers, params=query_params)
        else:
            raise ValueError(f"Method {method} not supported.")

        if response.status_code >= 400:
            raise Exception(f"Admin DB Error {response.status_code}: {response.text}")

        return response.json() if response.text.strip() else []

async def supabase_auth_request(
    endpoint: str,
    method: str = "GET",
    data: Optional[Dict[str, Any]] = None,
    token: Optional[str] = None
) -> Dict[str, Any]:
    """
    Unified HTTP helper for Supabase GoTrue Auth operations.
    Supports JWT validation and login/signup flows.
    """
    url = f"{SUPABASE_URL}/auth/v1/{endpoint}"
    req_headers = {
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json"
    }
    
    if token:
        req_headers["Authorization"] = f"Bearer {token}"
    else:
        req_headers["Authorization"] = f"Bearer {SUPABASE_KEY}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        if method == "GET":
            response = await client.get(url, headers=req_headers)
        elif method == "POST":
            response = await client.post(url, headers=req_headers, json=data)
        else:
            raise ValueError(f"Method {method} not supported for Auth.")

        if response.status_code >= 400:
            raise Exception(f"Auth Error {response.status_code}: {response.text}")

        return response.json()

async def supabase_admin_auth_request(
    endpoint: str,
    method: str = "POST",
    data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Interacts with Supabase GoTrue Auth Admin API.
    Requires Service Role Key.
    """
    if not SUPABASE_SERVICE_ROLE_KEY:
        raise Exception("SUPABASE_SERVICE_ROLE_KEY is required for admin auth operations.")

    url = f"{SUPABASE_URL}/auth/v1/admin/{endpoint}"
    req_headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        if method == "GET":
            response = await client.get(url, headers=req_headers)
        elif method == "POST":
            response = await client.post(url, headers=req_headers, json=data)
        elif method == "PUT":
            response = await client.put(url, headers=req_headers, json=data)
        elif method == "DELETE":
            response = await client.delete(url, headers=req_headers)
        else:
            raise ValueError(f"Method {method} not supported for Admin Auth.")

        if response.status_code >= 400:
            raise Exception(f"Admin Auth Error {response.status_code}: {response.text}")

        return response.json()
