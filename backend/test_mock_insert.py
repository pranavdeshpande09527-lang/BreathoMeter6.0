import asyncio
import os
import sys
import json
from httpx import AsyncClient

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import supabase_request

async def test_insert():
    payload = {
        "user_id": "00000000-0000-0000-0000-000000000000",
        "final_risk_score": 0.31,
        "predicted_condition": "Low Risk",
        "risk_category": "Low Risk",
        "ai_explanation": "Test explanation",
        "top_risk_factors": ["Test"],
        "ml_score": 0.30,
        "ai_score": 0.35,
        "agreement_score": 0.95,
        "confidence_score": 0.95
    }
    
    try:
        # We need a valid token or just wait to see if it throws a generic DB error vs permissions
        # Actually, maybe we can just sign in to get a token
        print("Testing payload keys against schema...")
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(test_insert())
