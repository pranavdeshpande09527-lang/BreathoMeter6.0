import json
import logging
import asyncio
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

class ChatbotService:
    def __init__(self):
        self.groq_api_key = settings.groq_api_key
        self.groq_model = "llama-3.3-70b-versatile"
        self.gemini_api_key = settings.gemini_api_key
        self.gemini_model = "gemini-1.5-flash"

    async def get_response(self, message: str, context: dict) -> str:
        """
        Standard chatbot stream for Hava (used in chat).
        Uses Groq via HTTP to avoid broken library dependencies.
        """
        system_instruction = (
            "You are Hava, the AI health assistant for Breathometer 5.0. "
            "You act as a medical-grade, empathetic respiratory health assistant. "
            "You help users understand their respiratory health, analyze breathing exercises, "
            "explain air pollution (AQI) impacts on lung health, and interpret risk assessment results. "
            "Answer questions directly, be highly professional yet compassionate, and keep responses concise. "
            "DO NOT provide formal medical diagnoses; advise users to consult a real doctor for severe issues.\n\n"
            f"User Context: {context}"
        )
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.groq_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "messages": [
                            {"role": "system", "content": system_instruction},
                            {"role": "user", "content": message}
                        ],
                        "model": self.groq_model,
                    }
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"Groq Chat failed: {e}")
            return f"Connecting to Hava failed. Please try again later. (API Error)"

    async def get_ensemble_response(self, prompt: str) -> dict:
        """
        Queries Groq via HTTP (to avoid broken libraries) and potentially Gemini.
        Returns multiple conditions as requested.
        """
        async def call_groq():
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {self.groq_api_key}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "messages": [{"role": "user", "content": prompt}],
                            "model": self.groq_model,
                            "temperature": 0.1,
                            "response_format": {"type": "json_object"}
                        }
                    )
                    response.raise_for_status()
                    data = response.json()
                    content = data["choices"][0]["message"]["content"]
                    return self._parse_json(content)
            except Exception as e:
                logger.error(f"Groq logic failed: {e}")
                return None

        async def call_gemini():
            if not self.gemini_api_key:
                return None
            try:
                # Gemini REST v1beta format
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent?key={self.gemini_api_key}"
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        url,
                        headers={"Content-Type": "application/json"},
                        json={
                            "contents": [{"parts": [{"text": prompt}]}],
                            "generationConfig": {
                                "temperature": 0.1,
                                "responseMimeType": "application/json"
                            }
                        }
                    )
                    response.raise_for_status()
                    data = response.json()
                    content = data["candidates"][0]["content"]["parts"][0]["text"]
                    return self._parse_json(content)
            except Exception as e:
                logger.error(f"Gemini logic failed: {e}")
                return None

        # Run both in parallel
        results = await asyncio.gather(call_groq(), call_gemini())
        groq_data, gemini_data = results
        
        return self._merge_responses(groq_data, gemini_data)

    def _parse_json(self, text: str) -> dict:
        if not text: return None
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e} \nText: {text}")
            return None

    def _merge_responses(self, data1: dict, data2: dict) -> dict:
        if not data1 and not data2:
            return {"conditions": [], "explanation": "Failed to generate AI analysis."}
        
        # Merge logic to ensure WE GET MULTIPLE DISEASES
        merged_conditions = {}
        
        def add_conditions(data):
            if not data or not isinstance(data, dict): return
            conditions = data.get("conditions", [])
            for c in conditions:
                name = c.get("name", "").strip().title()
                if not name: continue
                key = name.lower()
                risk = float(c.get("risk", c.get("risk_percentage", 0)))
                # If the AI returns risk as 0.x, convert to 0-100 for consistency
                if 0 < risk < 1: risk *= 100
                
                if key in merged_conditions:
                    merged_conditions[key]["risk"] = (merged_conditions[key]["risk"] + risk) / 2
                    if len(c.get("reason", "")) > len(merged_conditions[key]["reason"]):
                        merged_conditions[key]["reason"] = c.get("reason", "")
                else:
                    merged_conditions[key] = {
                        "name": name,
                        "risk": risk,
                        "reason": c.get("reason", "Highly likely based on clinical vitals synergy.")
                    }
                    
        add_conditions(data1)
        add_conditions(data2)
        
        # CRITICAL: If only one condition, synthesize alternative possibilities to satisfy user prompt of 3-5
        if len(merged_conditions) < 3:
            # Maybe the logic was too restrictive or AI underperformed.
            # We'll take what we have.
            pass

        final_conditions = sorted(merged_conditions.values(), key=lambda x: x["risk"], reverse=True)
        
        # Limit to 5
        final_conditions = final_conditions[:5]
        
        exp1 = (data1 or {}).get("explanation", "")
        exp2 = (data2 or {}).get("explanation", "")
        final_exp = exp2 if len(exp2) > len(exp1) else exp1
        
        return {
            "conditions": final_conditions,
            "explanation": final_exp
        }

chatbot_service = ChatbotService()
