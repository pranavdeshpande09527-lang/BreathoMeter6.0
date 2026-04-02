"""
Email Service — Brevo (ex-Sendinblue) SMTP Relay Integration
Sends HTML emails via smtp-relay.brevo.com:587
Free tier: 300 emails/day, sends to any email address.
"""
import logging
import os
from email.message import EmailMessage
import aiosmtplib

logger = logging.getLogger(__name__)

# Configuration
SMTP_HOST = "smtp-relay.brevo.com"
SMTP_PORT = 587
# The BREVO_API_KEY env var now contains the SMTP key (xsmtpsib-...)
SMTP_PASSWORD = os.getenv("BREVO_API_KEY", "")
# Brevo SMTP user is the login provided in your dashboard
SMTP_USER = "a6f289001@smtp-brevo.com"

SENDER_NAME = "Breathometer"
SENDER_EMAIL = "pranavdeshpande09527@gmail.com"


async def send_email(to: str, subject: str, html: str) -> dict:
    """
    Send an HTML email via Brevo SMTP Relay using aiosmtplib.

    Args:
        to:      Recipient email address
        subject: Email subject line
        html:    Full HTML body content

    Returns:
        dict with status indicator

    Raises:
        RuntimeError on delivery failure
    """
    if not SMTP_PASSWORD:
        logger.error("SMTP_PASSWORD (BREVO_API_KEY) is not set — skipping delivery.")
        raise RuntimeError("Email service is not configured (missing credentials).")

    # Construct the email message
    message = EmailMessage()
    message["From"] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
    message["To"] = to
    message["Subject"] = subject
    
    # Set fallback plain text content
    message.set_content("Please enable HTML to view this health report.")
    
    # Add HTML alternative
    message.add_alternative(html, subtype="html")

    try:
        # Send via SMTP with StartTLS on Port 587
        await aiosmtplib.send(
            message,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USER,
            password=SMTP_PASSWORD,
            use_tls=False,   # True for Port 465 (SSL), False for Port 587 (StartTLS)
            start_tls=True,  # Enable StartTLS for secure handover
            timeout=20.0
        )
        
        logger.info(f"✅ Brevo SMTP email sent successfully to={to}")
        return {"status": "sent", "to": to}

    except aiosmtplib.SMTPAuthenticationError as e:
        logger.error(f"Brevo SMTP authentication failed: {e}")
        raise RuntimeError(f"Email delivery failed (Authentication Error): {e}") from e
    
    except aiosmtplib.SMTPDataError as e:
        logger.error(f"Brevo SMTP data/sender error: {e}")
        # Often occurs if the sender email is unverified or limit reached
        raise RuntimeError(f"Email delivery failed (SMTP Data Error): {e}") from e
        
    except Exception as e:
        logger.error(f"Unexpected SMTP error: {e}")
        raise RuntimeError(f"Email delivery failed: {str(e)}") from e
