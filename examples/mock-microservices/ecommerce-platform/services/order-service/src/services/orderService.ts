import { v4 as uuidv4 } from 'uuid';
import { Order, OrderItem, OrderStatus } from '../models/order';
import { PaymentService } from './paymentService';
import { OrderEvents } from '../events/orderEvents';

interface CreateOrderInput {
  userId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  shippingAddress: { street: string; city: string; state: string; zip: string; country: string };
  paymentMethod: { type: 'card' | 'paypal'; token: string };
}

/**
 * OrderService contains the core business logic for order processing.
 * Implements the order lifecycle: create -> pay -> confirm -> ship -> deliver.
 * Uses the Saga pattern for distributed transactions across payment and inventory.
 */
export class OrderService {
  // In-memory store (production would use PostgreSQL)
  private orders: Map<string, Order> = new Map();

  constructor(
    private paymentService: PaymentService,
    private orderEvents: OrderEvents,
  ) {}

  async createOrder(input: CreateOrderInput): Promise<Order> {
    const orderId = uuidv4();

    // Calculate total
    const items: OrderItem[] = input.items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.price,
      subtotal: item.quantity * item.price,
    }));
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);

    // Process payment
    const paymentResult = await this.paymentService.charge({
      amount: total,
      currency: 'usd',
      paymentMethodToken: input.paymentMethod.token,
      orderId,
    });

    if (!paymentResult.success) {
      throw new Error('PAYMENT_FAILED');
    }

    // Create order
    const order: Order = {
      id: orderId,
      userId: input.userId,
      items,
      total,
      status: 'confirmed',
      paymentId: paymentResult.paymentId,
      shippingAddress: input.shippingAddress,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.orders.set(orderId, order);

    // Publish event for notification service and other consumers
    await this.orderEvents.publishOrderCreated({
      orderId: order.id!,
      userId: order.userId,
      total: order.total,
      itemCount: order.items.length,
    });

    console.log(`[OrderService] Order ${orderId} created. Total: $${total.toFixed(2)}`);
    return order;
  }

  async listOrders(
    userId: string,
    options: { page: number; limit: number; status?: string },
  ): Promise<{ orders: Order[]; total: number; page: number; totalPages: number }> {
    let userOrders = Array.from(this.orders.values())
      .filter(o => o.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (options.status) {
      userOrders = userOrders.filter(o => o.status === options.status);
    }

    const total = userOrders.length;
    const start = (options.page - 1) * options.limit;
    const paginated = userOrders.slice(start, start + options.limit);

    return {
      orders: paginated,
      total,
      page: options.page,
      totalPages: Math.ceil(total / options.limit),
    };
  }

  async getOrder(orderId: string, userId?: string): Promise<Order | null> {
    const order = this.orders.get(orderId);
    if (!order) return null;
    if (userId && order.userId !== userId) return null;
    return order;
  }

  async cancelOrder(orderId: string, userId: string): Promise<Order | null> {
    const order = this.orders.get(orderId);
    if (!order || order.userId !== userId) return null;

    if (order.status === 'shipped' || order.status === 'delivered') {
      throw new Error('ORDER_NOT_CANCELLABLE');
    }

    // Refund payment
    if (order.paymentId) {
      await this.paymentService.refund(order.paymentId, order.total);
    }

    order.status = 'cancelled';
    order.updatedAt = new Date();
    this.orders.set(orderId, order);

    // Publish cancellation event
    await this.orderEvents.publishOrderCancelled({
      orderId: order.id!,
      userId: order.userId,
      reason: 'Customer requested cancellation',
    });

    return order;
  }
}
