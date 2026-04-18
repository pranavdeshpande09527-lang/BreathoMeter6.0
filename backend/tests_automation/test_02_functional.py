import requests
import uuid

def test_signup_missing_fields(base_url):
    """Phase 2: Functional - Test validation against missing input schemas using 422 Unprocessable Entity."""
    url = f"{base_url}/auth/signup"
    data_missing_fields = {
        "username": f"invalid_{uuid.uuid4().hex[:6]}"
        # Missing password, age, etc.
    }
    res = requests.post(url, json=data_missing_fields, timeout=60)
    # FastAPI automatically throws 422 if standard Pydantic validation fails
    assert res.status_code == 422 

def test_login_invalid_credentials(base_url):
    """Phase 2: Functional - Check failure on bad login."""
    url = f"{base_url}/auth/login"
    data = {
        "username": "bad_user_123_not_exist",
        "password": "wrong_password"
    }
    res = requests.post(url, json=data, timeout=60)
    assert res.status_code in [400, 401, 403, 404]  # Standard auth rejections

def test_authenticated_profile(base_url, auth_headers):
    """Phase 2: Functional - Retrieve user profile utilizing Bearer tokens."""
    url = f"{base_url}/auth/profile"
    res = requests.get(url, headers=auth_headers, timeout=60)
    assert res.status_code == 200, f"Token failed or user missing. Response: {res.text}"
    profile_data = res.json()
    assert "user" in profile_data or "profile" in profile_data or "id" in profile_data

def test_chatbot_invalid_auth(base_url):
    """Phase 4: Security - Access protected chatbot endpoint without token."""
    url = f"{base_url}/chatbot/message"
    res = requests.post(url, json={"message": "hello", "user_context": {}}, timeout=60)
    assert res.status_code in [401, 403] # Unauthorized access must be blocked
