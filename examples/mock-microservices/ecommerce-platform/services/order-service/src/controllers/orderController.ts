import { Request, Response } from 'express';
import { OrderService } from '../services/orderService';
import { z } from 'zod';

const createOrderSchema = z.object({
  userId: z.string(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
    price: z.number().positive(),
  })).min(1),
  shippingAddress: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
    country: z.string(),
  }),
  paymentMethod: z.object({
    type: z.enum(['card', 'paypal']),
    token: z.string(),
  }),
});

/**
 * OrderController handles HTTP endpoints for order operations.
 * Validates input, delegates to OrderService, and formats responses.
 */
export class OrderController {
  constructor(private orderService: OrderService) {}

  async listOrders(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.userId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string | undefined;

      if (!userId) {
        res.status(400).json({ error: 'Missing userId parameter' });
        return;
      }

      const result = await this.orderService.listOrders(userId, { page, limit, status });
      res.json(result);
    } catch (error) {
      console.error('[OrderController] List error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const parsed = createOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
      }

      const order = await this.orderService.createOrder(parsed.data);
      res.status(201).json(order);
    } catch (error: any) {
      if (error.message === 'PAYMENT_FAILED') {
        res.status(402).json({ error: 'Payment failed', message: 'Please check your payment method' });
        return;
      }
      if (error.message === 'INSUFFICIENT_STOCK') {
        res.status(409).json({ error: 'Insufficient stock for one or more items' });
        return;
      }
      console.error('[OrderController] Create error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getOrder(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.userId as string;
      const order = await this.orderService.getOrder(req.params.id, userId);

      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      res.json(order);
    } catch (error) {
      console.error('[OrderController] Get error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.body;
      const result = await this.orderService.cancelOrder(req.params.id, userId);

      if (!result) {
        res.status(404).json({ error: 'Order not found or cannot be cancelled' });
        return;
      }

      res.json({ message: 'Order cancelled successfully', order: result });
    } catch (error: any) {
      if (error.message === 'ORDER_NOT_CANCELLABLE') {
        res.status(409).json({ error: 'Order has already been shipped and cannot be cancelled' });
        return;
      }
      console.error('[OrderController] Cancel error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
