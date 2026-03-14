from groq import AsyncGroq
from app.config import settings

class ChatbotService:
    def __init__(self):
        self.client = AsyncGroq(api_key=settings.groq_api_key)
        self.model_name = "llama-3.1-8b-instant"

    async def get_response(self, message: str, context: dict) -> str:
        """
        Processes a chatbot message using Groq, injecting health context.
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
            response = await self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": message}
                ],
                model=self.model_name,
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Connecting to Hava failed. Please try again later. ({str(e)})"

chatbot_service = ChatbotService()
