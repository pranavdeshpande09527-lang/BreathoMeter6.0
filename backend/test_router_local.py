"""
test_router_local.py
Tests the AI routing directly to grab the Python traceback for the 500 error.
"""
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from app.services.chatbot_service import chatbot_service

async def main():
    print("Testing chatbot_service.get_response locally...")
    context = {"test": "data"}
    msg = "Test message"
    
    try:
        reply = await chatbot_service.get_response(msg, context)
        print("SUCCESS:")
        print(reply)
    except Exception as e:
        import traceback
        print("FAILURE:")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
