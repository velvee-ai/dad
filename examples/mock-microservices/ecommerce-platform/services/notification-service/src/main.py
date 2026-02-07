"""
Notification Service - Consumes Kafka events and sends notifications via email/SMS.

Listens to:
  - order.created -> sends order confirmation email
  - order.shipped -> sends shipping notification email + SMS
  - order.cancelled -> sends cancellation confirmation email

Integrates with:
  - SendGrid for email delivery
  - Twilio for SMS delivery
  - Kafka for event consumption
"""

import json
import os
from handlers.email_handler import EmailHandler
from handlers.sms_handler import SMSHandler


KAFKA_BROKERS = os.getenv("KAFKA_BROKERS", "localhost:9092")
KAFKA_GROUP_ID = "notification-service"
KAFKA_TOPIC = "order-events"


class NotificationService:
    """Main service that routes Kafka events to the appropriate notification handler."""

    def __init__(self):
        self.email_handler = EmailHandler()
        self.sms_handler = SMSHandler()
        self.handlers = {
            "order.created": self._handle_order_created,
            "order.shipped": self._handle_order_shipped,
            "order.cancelled": self._handle_order_cancelled,
            "order.delivered": self._handle_order_delivered,
        }

    def process_event(self, event_type: str, data: dict) -> None:
        """Routes an event to the appropriate handler."""
        handler = self.handlers.get(event_type)
        if handler:
            handler(data)
        else:
            print(f"[NotificationService] Unknown event type: {event_type}")

    def _handle_order_created(self, data: dict) -> None:
        """Sends order confirmation email."""
        self.email_handler.send_order_confirmation(
            user_id=data["userId"],
            order_id=data["orderId"],
            total=data["total"],
        )

    def _handle_order_shipped(self, data: dict) -> None:
        """Sends shipping notification via email and SMS."""
        self.email_handler.send_shipping_notification(
            user_id=data["userId"],
            order_id=data["orderId"],
            tracking_number=data.get("trackingNumber", ""),
            carrier=data.get("carrier", ""),
        )
        self.sms_handler.send_shipping_sms(
            user_id=data["userId"],
            order_id=data["orderId"],
            tracking_number=data.get("trackingNumber", ""),
        )

    def _handle_order_cancelled(self, data: dict) -> None:
        """Sends cancellation confirmation email."""
        self.email_handler.send_cancellation_confirmation(
            user_id=data["userId"],
            order_id=data["orderId"],
            reason=data.get("reason", ""),
        )

    def _handle_order_delivered(self, data: dict) -> None:
        """Sends delivery confirmation and review request."""
        self.email_handler.send_delivery_confirmation(
            user_id=data["userId"],
            order_id=data["orderId"],
        )

    def start(self) -> None:
        """Starts the Kafka consumer loop."""
        print(f"[NotificationService] Starting consumer on {KAFKA_BROKERS}")
        print(f"[NotificationService] Subscribed to topic: {KAFKA_TOPIC}")

        # In production, this would use confluent_kafka.Consumer:
        # consumer = Consumer({
        #     'bootstrap.servers': KAFKA_BROKERS,
        #     'group.id': KAFKA_GROUP_ID,
        #     'auto.offset.reset': 'earliest',
        # })
        # consumer.subscribe([KAFKA_TOPIC])
        # while True:
        #     msg = consumer.poll(1.0)
        #     if msg and not msg.error():
        #         event = json.loads(msg.value())
        #         self.process_event(event['eventType'], event['data'])

        print("[NotificationService] Consumer running (mock mode)")


if __name__ == "__main__":
    service = NotificationService()
    service.start()
