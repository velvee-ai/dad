/**
 * Shared event schemas used across all microservices.
 * Defines the contract for Kafka events published and consumed by services.
 */

export interface BaseEvent {
  eventType: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// --- Order Events ---

export interface OrderCreatedEvent extends BaseEvent {
  eventType: 'order.created';
  data: {
    orderId: string;
    userId: string;
    total: number;
    itemCount: number;
  };
}

export interface OrderCancelledEvent extends BaseEvent {
  eventType: 'order.cancelled';
  data: {
    orderId: string;
    userId: string;
    reason: string;
  };
}

export interface OrderShippedEvent extends BaseEvent {
  eventType: 'order.shipped';
  data: {
    orderId: string;
    userId: string;
    trackingNumber: string;
    carrier: string;
  };
}

export interface OrderDeliveredEvent extends BaseEvent {
  eventType: 'order.delivered';
  data: {
    orderId: string;
    userId: string;
  };
}

// --- User Events ---

export interface UserRegisteredEvent extends BaseEvent {
  eventType: 'user.registered';
  data: {
    userId: string;
    email: string;
    name: string;
  };
}

// Union type of all events
export type DomainEvent =
  | OrderCreatedEvent
  | OrderCancelledEvent
  | OrderShippedEvent
  | OrderDeliveredEvent
  | UserRegisteredEvent;

// Kafka topic mappings
export const EVENT_TOPICS: Record<string, string> = {
  'order.created': 'order-events',
  'order.cancelled': 'order-events',
  'order.shipped': 'order-events',
  'order.delivered': 'order-events',
  'user.registered': 'user-events',
};
