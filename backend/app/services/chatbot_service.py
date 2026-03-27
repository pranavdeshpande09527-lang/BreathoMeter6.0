import json
import logging
import asyncio
from groq import AsyncGroq
import google.generativeai as genai
from app.config import settings

logger = logging.getLogger(__name__)

class ChatbotService:
    def __init__(self):
        self.groq_client = AsyncGroq(api_key=settings.groq_api_key)
        self.groq_model = "llama-3.3-70b-versatile"
        
        try:
            genai.configure(api_key=settings.gemini_api_key)
            self.gemini_enabled = True
        except Exception as e:
            logger.warning(f"Failed to configure Gemini: {e}")
            self.gemini_enabled = False

    async def get_response(self, message: str, context: dict) -> str:
        """
        Standard chatbot stream for Hava (used in chat).
        """
        system_instruction = (
            "You are Hava, the AI health assistant for Breathometer 4.0. "
            "You act as a medical-grade, empathetic respiratory health assistant. "
            "You help users understand their respiratory health, analyze breathing exercises, "
            "explain air pollution (AQI) impacts on lung health, and interpret risk assessment results. "
            "Answer questions directly, be highly professional yet compassionate, and keep responses concise. "
            "DO NOT provide formal medical diagnoses; advise users to consult a real doctor for severe issues.\n\n"
            f"User Context: {context}"
        )
        
        try:
            response = await self.groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": message}
                ],
                model=self.groq_model,
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Connecting to Hava failed. Please try again later. ({str(e)})"

    async def get_ensemble_response(self, prompt: str) -> dict:
        """
        Queries both Groq and Gemini simultaneously to prevent hallucination,
        merges their results (conditions and risk scores) and returns a robust JSON dict.
        """
        async def call_groq():
            try:
                print("DEBUG: Calling Groq...")
                response = await self.groq_client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model=self.groq_model,
                    temperature=0.1,
                    response_format={"type": "json_object"}
                )
                raw_content = response.choices[0].message.content
                data = self._parse_json(raw_content)
                if data:
                    print(f"DEBUG: Groq Success. Got {len(data.get('conditions', []))} conditions.")
                return data
            except Exception as e:
                print(f"DEBUG: Groq Error: {e}")
                logger.error(f"Groq logic failed: {e}")
                return None

        async def call_gemini():
            if not self.gemini_enabled: 
                print("DEBUG: Gemini disabled.")
                return None
            try:
                print("DEBUG: Calling Gemini (models/gemini-1.5-flash)...")
                # Using a safer model config approach
                model = genai.GenerativeModel("models/gemini-1.5-flash")
                response = await model.generate_content_async(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.1,
                        response_mime_type="application/json"
                    )
                )
                data = self._parse_json(response.text)
                if data:
                    print(f"DEBUG: Gemini Success. Got {len(data.get('conditions', []))} conditions.")
                return data
            except Exception as e:
                print(f"DEBUG: Gemini Error: {e}")
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
        if not data1: return data2
        if not data2: return data1

        # Merge conditions
        merged_conditions = {}
        
        def add_conditions(data):
            conditions = data.get("conditions", [])
            for c in conditions:
                name = c.get("name", "").strip()
                if not name: continue
                # Basic string normalization to prevent duplicates (e.g., "Asthma" vs "asthma")
                key = name.lower()
                if key in merged_conditions:
                    # Average the risk probability
                    merged_conditions[key]["risk"] = (merged_conditions[key]["risk"] + c.get("risk", 0)) / 2
                else:
                    merged_conditions[key] = {
                        "name": name,
                        # Fallback for old output schema if models disobey
                        "risk": c.get("risk", c.get("risk_percentage", 0)), 
                        "reason": c.get("reason", "")
                    }
                    
        add_conditions(data1)
        add_conditions(data2)
        
        # Sort by risk and take top 6
        final_conditions = sorted(merged_conditions.values(), key=lambda x: x["risk"], reverse=True)[:6]
        
        # Merge explanations (just take the most detailed one since text merging is poor experience)
        exp1 = data1.get("explanation", "")
        exp2 = data2.get("explanation", "")
        final_exp = exp2 if len(exp2) > len(exp1) else exp1
        
        return {
            "conditions": final_conditions,
            "explanation": final_exp
        }

chatbot_service = ChatbotService()
