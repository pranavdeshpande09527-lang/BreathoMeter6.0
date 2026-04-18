import os
import pytest
import requests
import uuid

# Configuration
# Read target URL from environment or use deployed production URL
BASE_URL = os.getenv("TEST_API_URL", "https://breathometer6-0.onrender.com")

@pytest.fixture(scope="session")
def base_url():
    """Returns the base deployment URL."""
    return BASE_URL

@pytest.fixture(scope="session")
def new_user_credentials():
    """Generates unique credentials for dynamic signups."""
    return {
        "username": f"qa_test_{uuid.uuid4().hex[:8]}",
        "password": "StrongPassword123!",
        "full_name": "QA Subsystem Test",
        "role": "patient",
        "age": 25,
        "gender": "Female",
        "height": 165,
        "weight": 60,
        "smoking_status": "Never",
        "activity_level": "High"
    }

@pytest.fixture(scope="session")
def auth_token(base_url, new_user_credentials):
    """
    Signs up a test user and logs them in, returning the JWT access token.
    If signup fails (e.g. user exists), attempts login.
    """
    signup_url = f"{base_url}/auth/signup"
    login_url = f"{base_url}/auth/login"
    
    # 1. Try Signup
    res = requests.post(signup_url, json=new_user_credentials, timeout=60)
    token = None
    if res.status_code in [200, 201]:
        token = res.json().get("session", {}).get("access_token")
    
    # 2. If no token, attempt Login
    if not token:
        login_data = {
            "username": new_user_credentials["username"],
            "password": new_user_credentials["password"]
        }
        res_login = requests.post(login_url, json=login_data, timeout=60)
        if res_login.status_code == 200:
            token = res_login.json().get("session", {}).get("access_token")

    # Proceed even if token is None to let tests explicitly fail
    return token

@pytest.fixture(scope="session")
def auth_headers(auth_token):
    if auth_token:
        return {"Authorization": f"Bearer {auth_token}"}
    return {}
