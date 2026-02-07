"""
EmailHandler sends transactional emails via SendGrid API.

Handles:
  - Order confirmation emails
  - Shipping notification emails
  - Cancellation confirmation emails
  - Delivery confirmation + review request emails
"""

import os

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "mock-api-key")
FROM_EMAIL = os.getenv("FROM_EMAIL", "orders@acme.com")


class EmailHandler:
    """Sends transactional emails using SendGrid."""

    def __init__(self):
        self.api_key = SENDGRID_API_KEY
        self.from_email = FROM_EMAIL

    def send_order_confirmation(self, user_id: str, order_id: str, total: float) -> None:
        """Sends order confirmation email with order details and receipt."""
        subject = f"Order Confirmed: #{order_id}"
        html = f"""
        <h1>Order Confirmed!</h1>
        <p>Your order <strong>#{order_id}</strong> has been confirmed.</p>
        <p>Total: <strong>${total:.2f}</strong></p>
        <p>We'll send you a notification when your order ships.</p>
        """
        self._send(user_id, subject, html)

    def send_shipping_notification(
        self, user_id: str, order_id: str, tracking_number: str, carrier: str
    ) -> None:
        """Sends shipping notification with tracking information."""
        subject = f"Your Order #{order_id} Has Shipped!"
        html = f"""
        <h1>Your Order is On Its Way!</h1>
        <p>Order <strong>#{order_id}</strong> has been shipped via {carrier}.</p>
        <p>Tracking number: <strong>{tracking_number}</strong></p>
        <p><a href="https://track.acme.com/{tracking_number}">Track your package</a></p>
        """
        self._send(user_id, subject, html)

    def send_cancellation_confirmation(
        self, user_id: str, order_id: str, reason: str
    ) -> None:
        """Sends cancellation confirmation with refund information."""
        subject = f"Order #{order_id} Cancelled"
        html = f"""
        <h1>Order Cancelled</h1>
        <p>Your order <strong>#{order_id}</strong> has been cancelled.</p>
        <p>Reason: {reason}</p>
        <p>A refund will be processed within 5-7 business days.</p>
        """
        self._send(user_id, subject, html)

    def send_delivery_confirmation(self, user_id: str, order_id: str) -> None:
        """Sends delivery confirmation and asks for a product review."""
        subject = f"Order #{order_id} Delivered!"
        html = f"""
        <h1>Your Order Has Been Delivered!</h1>
        <p>Order <strong>#{order_id}</strong> has been delivered.</p>
        <p>We hope you love your purchase!</p>
        <p><a href="https://acme.com/orders/{order_id}/review">Leave a review</a></p>
        """
        self._send(user_id, subject, html)

    def _send(self, to_user_id: str, subject: str, html: str) -> None:
        """Sends an email via SendGrid API."""
        # In production, this would use the SendGrid SDK:
        # from sendgrid import SendGridAPIClient
        # from sendgrid.helpers.mail import Mail
        # message = Mail(from_email=self.from_email, to_emails=user_email, subject=subject, html_content=html)
        # sg = SendGridAPIClient(self.api_key)
        # sg.send(message)

        print(f"[EmailHandler] Sending to user {to_user_id}: {subject}")
