import logging
from app.services.ai_fallback_router import call_with_fallback, parse_json_safe, STATIC_FALLBACKS

logger = logging.getLogger(__name__)

class ChatbotService:
    def __init__(self):
        # API keys and models are now managed centrally by the ai_fallback_router
        pass

    async def get_response(self, message: str, context: dict) -> str:
        """
        Standard chatbot stream for Hava (used in chat).
        Uses the central AI router for fail-proof reliability.
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
            return await call_with_fallback(
                purpose="chat",
                user_prompt=message,
                system_prompt=system_instruction,
                json_mode=False
            )
        except Exception as e:
            # We should never reach this because call_with_fallback guarantees a response
            logger.error(f"FATAL: Chatbot fallback router failed entirely: {e}")
            return "Connecting to Hava failed. Please try again later. (System Error)"

    async def get_ensemble_response(self, prompt: str) -> dict:
        """
        Queries the central AI router for the ensemble diagnosis logic.
        """
        try:
            text = await call_with_fallback(
                purpose="ensemble",
                user_prompt=prompt,
                json_mode=True
            )
            data = parse_json_safe(text)
            
            if not data or not isinstance(data, dict):
                logger.error(f"Failed to parse ensemble JSON fallback. Raw text: {text}")
                # Use the static ensemble instead of returning empty conditions
                return self._format_conditions(STATIC_FALLBACKS["ensemble"])
                
            return self._format_conditions(data)
            
        except Exception as e:
            logger.error(f"FATAL: Ensemble fallback router failed entirely: {e}")
            return {"conditions": [], "explanation": "System Error: AI reasoning failed."}

    def _format_conditions(self, data: dict) -> dict:
        """Helper to ensure conditions are properly formatted before returning to inference_api"""
        conditions = data.get("conditions", [])
        final_conditions = []
        
        for c in conditions:
            name = str(c.get("name", "")).strip().title()
            if not name: continue
            
            risk = float(c.get("risk", c.get("risk_percentage", 0)))
            if 0 < risk < 1: risk *= 100
                
            final_conditions.append({
                "name": name,
                "risk": risk,
                "reason": str(c.get("reason", "Identified based on clinical vitals."))
            })
            
        # Limit to top 5
        final_conditions = sorted(final_conditions, key=lambda x: x["risk"], reverse=True)[:5]
        
        return {
            "conditions": final_conditions,
            "explanation": str(data.get("explanation", "Reasoning complete."))
        }

chatbot_service = ChatbotService()
