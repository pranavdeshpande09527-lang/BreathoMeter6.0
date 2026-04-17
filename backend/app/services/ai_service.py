import logging
from app.services.ai_fallback_router import call_with_fallback

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        # API keys and models are now managed centrally by the ai_fallback_router
        pass

    async def generate_explanation(self, topic: str, user_data: dict) -> str:
        """
        Generates explanation using the central AI router for max reliability.
        """
        prompt = (
            f"As a respiratory health AI assistant for Breathometer 5.0, explain this topic to the user:\n"
            f"Topic: {topic}\n"
            f"User Context Data: {user_data}\n"
            "Keep the explanation concise, medically safe, and easy to understand for a layperson. Provide actionable advice."
        )
        
        try:
            return await call_with_fallback(
                purpose="explanation",
                user_prompt=prompt,
                json_mode=False
            )
        except Exception as e:
            # Failsafe
            logger.error(f"FATAL: Explanation fallback router failed entirely: {e}")
            return "Unable to generate explanation at this time. (System Error)"

ai_service = AIService()
