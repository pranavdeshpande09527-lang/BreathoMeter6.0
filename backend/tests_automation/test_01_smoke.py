import requests

def test_root_returns_healthy(base_url):
    """Phase 1: Smoke Test - Root API endpoint must be healthy."""
    res = requests.get(f"{base_url}/", timeout=60)
    assert res.status_code == 200
    data = res.json()
    assert data.get("status") == "healthy"

def test_ping_endpoint(base_url):
    """Phase 1: Smoke Test - Ping check."""
    res = requests.get(f"{base_url}/ping", timeout=60)
    assert res.status_code == 200
    assert "OK" in res.text

def test_system_status_endpoint(base_url):
    """Phase 1: Smoke Test - Deep system readiness check."""
    res = requests.get(f"{base_url}/system-status", timeout=60)
    assert res.status_code == 200
    data = res.json()
    # Confirm fundamental subsystems are at least recognized
    assert data.get("api") == "ok"
    # Even if DB or ML implies 'clinical_only' or 'error', the API should gracefully return this JSON without crashing.
    assert "database" in data
    assert "ml_models" in data
