import smtplib
from email.message import EmailMessage
from app.config import settings
from app.utils.logger import app_logger

async def send_verification_email(to_email: str, verify_link: str) -> bool:
    """
    Sends an HTML verification email via SMTP.
    Supports standard providers like Resend, SendGrid, and Brevo.
    """
    if not settings.smtp_host or not settings.smtp_user or not settings.smtp_password:
        app_logger.error("SMTP is not fully configured, cannot send verification email.")
        return False

    msg = EmailMessage()
    msg['Subject'] = 'Verify your Breathometer account'
    msg['From'] = settings.smtp_from_email or "breathometer.privacy@gmail.com"
    msg['To'] = to_email

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; padding: 20px; }}
            .container {{ max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }}
            .logo {{ font-size: 24px; font-weight: bold; color: #2563EB; margin-bottom: 20px; }}
            .btn {{ display: inline-block; padding: 12px 24px; background-color: #2563EB; color: white !important; font-weight: bold; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
            .footer {{ font-size: 12px; color: #71717a; margin-top: 30px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">Breathometer</div>
            <h2>Verify your email address</h2>
            <p>Welcome! Please click the button below to verify your email address and activate your account.</p>
            <a href="{verify_link}" class="btn">Verify Account</a>
            <p style="font-size: 14px; color: #52525b;">This link will expire in 24 hours.</p>
            <div class="footer">
                If you didn't create an account, you can safely ignore this email.<br>
                For support, contact breathometer.privacy@gmail.com
            </div>
        </div>
    </body>
    </html>
    """
    msg.set_content(html_content, subtype='html')

    try:
        # Use starttls for port 587
        server = smtplib.SMTP(settings.smtp_host, settings.smtp_port)
        if settings.smtp_port == 587:
            server.starttls()
            
        server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(msg)
        server.quit()
        
        app_logger.info(f"Verification email sent to {to_email}")
        return True
    except Exception as e:
        app_logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False
