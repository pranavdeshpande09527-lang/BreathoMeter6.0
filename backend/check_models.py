import google.generativeai as genai
import os
from dotenv import load_dotenv

# Try to find .env in current or parent
load_dotenv(".env")
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    # Try reaching for settings if in app context, but here let's try direct
    print("GEMINI_API_KEY not found in env")

genai.configure(api_key=api_key)

print("Listing models...")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
except Exception as e:
    print(f"Error: {e}")
