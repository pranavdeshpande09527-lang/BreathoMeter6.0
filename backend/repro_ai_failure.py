import asyncio
import os
import json
import httpx
from dotenv import load_dotenv

# Mocking the context for inference_api
load_dotenv()

async def test_ai_reasoning():
    # Simulate the prompt from inference_api.py
    ml_score = 0.65
    input_dict = {
        "pm25": 45,
        "pm10": 60,
        "no2": 25,
        "so2": 10,
        "o3": 35,
        "humidity": 60,
        "temp": 28
    }
    optional_patient_data = {
        "age": 25,
        "weight": 70,
        "height": 175,
        "known_conditions": "None",
        "smoking_status": "Never"
    }

    ai_prompt = f"""
You are an AI Clinical Assistant specialized in respiratory medicine and environmental health.
The predictive ensemble model has calculated a base risk probability of {ml_score:.2f} based on:
Environmental Metrics: {json.dumps(input_dict, indent=2)}
Patient Contextual Factors: {json.dumps(optional_patient_data)}

Your task is to provide an 'AI Clinical Reasoning' to validate and explain this respiratory risk.
Please provide a detailed, multi-dimensional clinical explanation (2-3 paragraphs) covering:
1. Environmental Impact Analysis: Discuss how specific pollutants (PM2.5, PM10, NO2, SO2, O3) and weather factors (Humidity, Temp) are interacting and impacting pulmonary function in this scenario.
2. Clinical Correlates: Explain why this specific combination of variables increases the risk of specific respiratory conditions (e.g., how high PM2.5 triggers bronchoconstriction or airway inflammation).
3. Risk Score Justification & Health Strategy: Provide clinical rationale for the risk level and suggest 2-3 actionable, high-impact preventive health measures.

Keep the language professional, medically grounded, yet accessible. 
Return EXACTLY in this JSON format, do not include markdown blocks or any other text:
{{"ai_score": 0.65, "explanation": "Detailed clinical reasoning string here...", "disease_risks": [{{"disease": "Asthma", "risk_percentage": 75}}, {{"disease": "COPD", "risk_percentage": 20}}]}}
"""

    # We need to call the actual Groq API since we're debugging the live service
    # Re-implementing logic from chatbot_service.py
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("GROQ_API_KEY not found in .env")
        return

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": "You are a specialized clinical AI assistant."},
            {"role": "user", "content": ai_prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 2048
    }

    async with httpx.AsyncClient() as client:
        try:
            print("Sending request to Groq...")
            response = await client.post(url, headers=headers, json=payload, timeout=30.0)
            response.raise_for_status()
            result = response.json()
            ai_response_text = result['choices'][0]['message']['content']
            print("\nRAW AI RESPONSE:")
            print(ai_response_text)
            
            # Simulated cleaning logic from inference_api.py
            cleaned_response = ai_response_text.strip()
            if cleaned_response.startswith("```json"):
                cleaned_response = cleaned_response[7:]
            if cleaned_response.startswith("```"):
                cleaned_response = cleaned_response[3:]
            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]
            
            print("\nCLEANED RESPONSE:")
            print(cleaned_response)
            
            ai_data = json.loads(cleaned_response.strip())
            print("\nSUCCESSFULLY PARSED JSON:")
            print(json.dumps(ai_data, indent=2))
            
        except Exception as e:
            print(f"\nERROR: {e}")
            if hasattr(e, 'response'):
                print(f"Response content: {e.response.text}")

if __name__ == "__main__":
    asyncio.run(test_ai_reasoning())
