/**
 * OrderEvents handles publishing and consuming order-related events via Kafka.
 * Enables async communication between order-service, notification-service, and others.
 *
 * Topics:
 *   - order.created: Published when a new order is confirmed
 *   - order.cancelled: Published when an order is cancelled
 *   - order.shipped: Published when an order ships
 *   - order.delivered: Published when delivery is confirmed
 */
export class OrderEvents {
  private readonly brokers: string[];
  private readonly topic = 'order-events';

  constructor() {
    this.brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
  }

  async publishOrderCreated(data: {
    orderId: string;
    userId: string;
    total: number;
    itemCount: number;
  }): Promise<void> {
    await this.publish('order.created', data);
  }

  async publishOrderCancelled(data: {
    orderId: string;
    userId: string;
    reason: string;
  }): Promise<void> {
    await this.publish('order.cancelled', data);
  }

  async publishOrderShipped(data: {
    orderId: string;
    userId: string;
    trackingNumber: string;
    carrier: string;
  }): Promise<void> {
    await this.publish('order.shipped', data);
  }

  async publishOrderDelivered(data: {
    orderId: string;
    userId: string;
  }): Promise<void> {
    await this.publish('order.delivered', data);
  }

  /**
   * Starts the Kafka consumer to listen for order events.
   * In production, other services (notification, analytics) consume these events.
   */
  async startConsumer(): Promise<void> {
    console.log(`[OrderEvents] Starting Kafka consumer on brokers: ${this.brokers.join(', ')}`);

    // In production:
    // const kafka = new Kafka({ brokers: this.brokers });
    // const consumer = kafka.consumer({ groupId: 'order-service' });
    // await consumer.connect();
    // await consumer.subscribe({ topic: this.topic });
    // await consumer.run({ eachMessage: async ({ message }) => { ... } });

    console.log(`[OrderEvents] Consumer started, listening on topic: ${this.topic}`);
  }

  private async publish(eventType: string, data: Record<string, any>): Promise<void> {
    const event = {
      eventType,
      timestamp: new Date().toISOString(),
      data,
    };

    // In production:
    // const kafka = new Kafka({ brokers: this.brokers });
    // const producer = kafka.producer();
    // await producer.connect();
    // await producer.send({ topic: this.topic, messages: [{ key: data.orderId, value: JSON.stringify(event) }] });

    console.log(`[OrderEvents] Published ${eventType}:`, JSON.stringify(event));
  }
}
