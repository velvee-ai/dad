import { Router, Request, Response } from 'express';

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:4002';

export const orderRoutes = Router();

/**
 * GET /api/orders
 * Lists orders for the authenticated user
 */
orderRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { page = '1', limit = '20', status } = req.query;

    const params = new URLSearchParams({
      userId,
      page: String(page),
      limit: String(limit),
      ...(status && { status: String(status) }),
    });

    const response = await fetch(`${ORDER_SERVICE_URL}/orders?${params}`);
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('[Order Route] List error:', error);
    return res.status(502).json({ error: 'Order service unavailable' });
  }
});

/**
 * POST /api/orders
 * Creates a new order for the authenticated user
 */
orderRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { items, shippingAddress, paymentMethod } = req.body;

    if (!items?.length || !shippingAddress || !paymentMethod) {
      return res.status(400).json({ error: 'Missing required fields: items, shippingAddress, paymentMethod' });
    }

    const response = await fetch(`${ORDER_SERVICE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, items, shippingAddress, paymentMethod }),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('[Order Route] Create error:', error);
    return res.status(502).json({ error: 'Order service unavailable' });
  }
});

/**
 * GET /api/orders/:id
 * Gets a specific order by ID
 */
orderRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const response = await fetch(`${ORDER_SERVICE_URL}/orders/${req.params.id}?userId=${userId}`);
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('[Order Route] Get error:', error);
    return res.status(502).json({ error: 'Order service unavailable' });
  }
});

/**
 * PUT /api/orders/:id/cancel
 * Cancels an order
 */
orderRoutes.put('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const response = await fetch(`${ORDER_SERVICE_URL}/orders/${req.params.id}/cancel`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('[Order Route] Cancel error:', error);
    return res.status(502).json({ error: 'Order service unavailable' });
  }
});
