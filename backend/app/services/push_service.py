import os
import json
import logging
import firebase_admin
from firebase_admin import credentials, messaging
from typing import List, Optional, Dict, Any

logger = logging.getLogger(__name__)

class PushService:
    def __init__(self):
        self._initialized = False
        self._initialize()

    def _initialize(self):
        """Initialize Firebase Admin SDK using environment variable or a file."""
        if self._initialized:
            return

        try:
            # Check for JSON string in environment variable
            creds_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
            if creds_json:
                logger.info("Initializing Firebase Admin SDK from environment variable.")
                cred_dict = json.loads(creds_json)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                self._initialized = True
                return

            # fallback to local file if exists (for local development)
            creds_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "firebase-service-account.json")
            if os.path.exists(creds_path):
                logger.info(f"Initializing Firebase Admin SDK from file: {creds_path}")
                cred = credentials.Certificate(creds_path)
                firebase_admin.initialize_app(cred)
                self._initialized = True
                return

            logger.warning("Firebase Admin SDK credentials not found. Push notifications will be disabled.")
        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin SDK: {e}")

    def send_push_notification(
        self, 
        tokens: List[str], 
        title: str, 
        body: str, 
        data: Optional[Dict[str, str]] = None,
        image_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Sends a push notification to multiple tokens.
        """
        if not self._initialized:
            logger.warning("FCM service not initialized. Skipping notification.")
            return {"success": False, "error": "Not initialized"}

        if not tokens:
            logger.info("No tokens provided for push notification.")
            return {"success": True, "sent_count": 0}

        try:
            # Prepare notification
            notification = messaging.Notification(
                title=title,
                body=body,
                image=image_url
            )

            # Send multicast message
            message = messaging.MulticastMessage(
                notification=notification,
                data=data,
                tokens=tokens,
                webpush=messaging.WebpushConfig(
                    notification=messaging.WebpushNotification(
                        icon="/logo192.png",
                        badge="/badge.png"
                    )
                )
            )

            response = messaging.send_multicast(message)
            
            logger.info(f"Successfully sent {response.success_count} messages; "
                        f"Failed {response.failure_count} messages.")

            # Identify invalid tokens to clean up
            invalid_tokens = []
            if response.failure_count > 0:
                for idx, res in enumerate(response.responses):
                    if not res.success:
                        # Extract the token that failed
                        token = tokens[idx]
                        logger.warning(f"FCM failure for token {token[:10]}...: {res.exception}")
                        # If the error is Unregistered, the token is invalid
                        if "unregistered" in str(res.exception).lower():
                            invalid_tokens.append(token)

            return {
                "success": True,
                "sent_count": response.success_count,
                "failure_count": response.failure_count,
                "invalid_tokens": invalid_tokens
            }

        except Exception as e:
            logger.error(f"Error sending FCM message: {e}")
            return {"success": False, "error": str(e)}

# Singleton instance
push_service = PushService()
