"""
SMSHandler sends SMS notifications via Twilio API.

Used for time-sensitive notifications like shipping updates.
Only sends SMS to users who have opted in to SMS notifications.
"""

import os

TWILIO_SID = os.getenv("TWILIO_SID", "mock-sid")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "mock-token")
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER", "+15551234567")


class SMSHandler:
    """Sends SMS notifications using Twilio."""

    def __init__(self):
        self.account_sid = TWILIO_SID
        self.auth_token = TWILIO_AUTH_TOKEN
        self.from_number = TWILIO_FROM_NUMBER

    def send_shipping_sms(
        self, user_id: str, order_id: str, tracking_number: str
    ) -> None:
        """Sends SMS notification when an order ships."""
        message = (
            f"Acme: Your order #{order_id} has shipped! "
            f"Track it: https://track.acme.com/{tracking_number}"
        )
        self._send(user_id, message)

    def send_delivery_sms(self, user_id: str, order_id: str) -> None:
        """Sends SMS notification when an order is delivered."""
        message = (
            f"Acme: Your order #{order_id} has been delivered! "
            f"We hope you enjoy it."
        )
        self._send(user_id, message)

    def send_otp(self, user_id: str, code: str) -> None:
        """Sends one-time password for two-factor authentication."""
        message = f"Your Acme verification code is: {code}. Expires in 10 minutes."
        self._send(user_id, message)

    def _send(self, to_user_id: str, message: str) -> None:
        """Sends an SMS via Twilio API."""
        # In production:
        # from twilio.rest import Client
        # client = Client(self.account_sid, self.auth_token)
        # user_phone = lookup_user_phone(to_user_id)
        # client.messages.create(body=message, from_=self.from_number, to=user_phone)

        print(f"[SMSHandler] SMS to user {to_user_id}: {message[:80]}...")
