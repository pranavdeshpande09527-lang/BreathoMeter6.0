import requests
import json

def test_api():
    url = "http://localhost:8000/prediction/store"
    
    # We need a token for the user, but maybe we can just get one by signing in.
    # The browser subagent skipped sign up and used an existing session, but we can sign in.
    auth_url = "http://localhost:8000/auth/login"
    try:
        # Use simple test creds or try without token to see error
        print("Testing endpoint without auth first...")
        payload = {
            "final_risk_score": 0.31,
            "risk_category": "Low Risk",
            "ai_explanation": "Test explanation",
            "top_risk_factors": ["Test"],
            "ml_score": 0.30,
            "ai_score": 0.35,
            "agreement_score": 0.95,
            "confidence_score": 0.95
        }
        res = requests.post(url, json=payload)
        print("Response:", res.status_code, res.text)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    test_api()
