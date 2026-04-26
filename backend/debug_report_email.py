import asyncio
import logging
from app.routes.email import _send_report_background

logging.basicConfig(level=logging.INFO)

async def test_background():
    print("Testing generate_report_email and sending email...")
    await _send_report_background(
        email="pranavdeshpande@gmail.com", # assuming this is where he wants it
        name="Pranav Test",
        aqi=105,
        city="Pune",
        category="Unhealthy for Sensitive Groups",
        metrics={"fev1": 85, "spo2": 95, "risk_score": 10.5}
    )

if __name__ == "__main__":
    asyncio.run(test_background())
