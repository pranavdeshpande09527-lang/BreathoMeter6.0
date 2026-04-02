import httpx
import logging
from app.config import settings

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        self.api_key = settings.gemini_api_key
        self.model = "gemini-1.5-flash"

    async def generate_explanation(self, topic: str, user_data: dict) -> str:
        """
        Generates explanation using Gemini REST API based on topic and user context.
        Bypasses broken google-generativeai library dependencies.
        """
        if not self.api_key:
            return "AI service is currently unavailable as it is not configured."

        prompt = (
            f"As a respiratory health AI assistant for Breathometer 5.0, explain this topic to the user:\n"
            f"Topic: {topic}\n"
            f"User Context Data: {user_data}\n"
            "Keep the explanation concise, medically safe, and easy to understand for a layperson. Provide actionable advice."
        )
        
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "temperature": 0.1
                        }
                    }
                )
                response.raise_for_status()
                data = response.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            logger.error(f"Gemini Explanation failed: {e}")
            return f"Unable to generate explanation at this time. (API Service Unavailable)"

ai_service = AIService()
