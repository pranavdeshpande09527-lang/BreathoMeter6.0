import httpx
from app.config import settings
from typing import Optional, Dict, Any, List, Union

SUPABASE_URL = settings.supabase_url
SUPABASE_KEY = settings.supabase_key
SUPABASE_SERVICE_ROLE_KEY = settings.supabase_service_role_key

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
    Generic async function to interact with Supabase PostgREST API.
    
    For GET: pass filters as query_params, e.g. {"user_id": "eq.abc123", "order": "created_at.desc", "limit": "1"}
    For POST: pass the record dict as data.
    """
    url = f"{SUPABASE_URL}/rest/v1/{table}"

    req_headers = headers.copy()
    if token:
        req_headers["Authorization"] = f"Bearer {token}"

    async with httpx.AsyncClient(timeout=15.0) as client:
        if method == "GET":
            response = await client.get(url, headers=req_headers, params=query_params)
        elif method == "POST":
            response = await client.post(url, headers=req_headers, json=data)
        elif method == "PATCH":
            response = await client.patch(url, headers=req_headers, json=data, params=query_params)
        elif method == "DELETE":
            response = await client.delete(url, headers=req_headers, params=query_params)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")

        if response.status_code >= 400:
            error_detail = response.text
            try:
                error_json = response.json()
                error_detail = error_json.get("message", error_json.get("hint", response.text))
            except Exception:
                pass
            raise Exception(f"Supabase DB error ({response.status_code}): {error_detail}")

        # Handle empty 204 responses
        if response.status_code == 204 or not response.text.strip():
            return []

        return response.json()


async def supabase_admin_request(
    table: str,
    method: str = "GET",
    data: Optional[Dict[str, Any]] = None,
    query_params: Optional[Dict[str, str]] = None
) -> Union[List[Dict], Dict, None]:
    """
    Generic async function to interact with Supabase PostgREST API using the Service Role Key.
    Bypasses Row Level Security (RLS).
    """
    if not SUPABASE_SERVICE_ROLE_KEY:
        raise Exception("SUPABASE_SERVICE_ROLE_KEY is not configured on the server.")

    url = f"{SUPABASE_URL}/rest/v1/{table}"

    req_headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        if method == "GET":
            response = await client.get(url, headers=req_headers, params=query_params)
        elif method == "POST":
            response = await client.post(url, headers=req_headers, json=data)
        elif method == "PATCH":
            response = await client.patch(url, headers=req_headers, json=data, params=query_params)
        elif method == "DELETE":
            response = await client.delete(url, headers=req_headers, params=query_params)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")

        if response.status_code >= 400:
            error_detail = response.text
            try:
                error_json = response.json()
                error_detail = error_json.get("message", error_json.get("hint", response.text))
            except Exception:
                pass
            raise Exception(f"Supabase Admin DB error ({response.status_code}): {error_detail}")

        # Handle empty 204 responses
        if response.status_code == 204 or not response.text.strip():
            return []

        return response.json()


async def supabase_auth_request(
    endpoint: str,
    method: str = "GET",
    data: Optional[Dict[str, Any]] = None,
    token: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generic async function to interact with Supabase GoTrue Auth API.
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

    async with httpx.AsyncClient(timeout=15.0) as client:
        if method == "GET":
            response = await client.get(url, headers=req_headers)
        elif method == "POST":
            response = await client.post(url, headers=req_headers, json=data)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")

        if response.status_code >= 400:
            print(f"Supabase Auth Error {response.status_code}: {response.text}")
            try:
                error_data = response.json()
                msg = error_data.get("error_description") or error_data.get("msg") or error_data.get("error") or "Unknown Auth Error"
            except Exception:
                msg = response.text or "Unknown Auth Error"
            raise Exception(msg)

        return response.json()


async def supabase_admin_auth_request(
    endpoint: str,
    method: str = "POST",
    data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Function to interact with Supabase GoTrue Auth Admin API.
    Requires SUPABASE_SERVICE_ROLE_KEY.
    """
    if not SUPABASE_SERVICE_ROLE_KEY:
        raise Exception("SUPABASE_SERVICE_ROLE_KEY is not configured on the server.")

    url = f"{SUPABASE_URL}/auth/v1/admin/{endpoint}"

    req_headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        if method == "GET":
            response = await client.get(url, headers=req_headers)
        elif method == "POST":
            response = await client.post(url, headers=req_headers, json=data)
        elif method == "PUT":
            response = await client.put(url, headers=req_headers, json=data)
        elif method == "DELETE":
            response = await client.delete(url, headers=req_headers)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")

        if response.status_code >= 400:
            try:
                error_data = response.json()
                msg = error_data.get("message") or error_data.get("error_description") or error_data.get("msg") or error_data.get("error") or "Unknown Admin Auth Error"
            except Exception:
                msg = response.text or "Unknown Admin Auth Error"
            raise Exception(f"Admin API Error: {msg}")

        return response.json()
