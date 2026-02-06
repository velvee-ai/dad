import express from 'express';
import { OrderController } from './controllers/orderController';
import { OrderService } from './services/orderService';
import { PaymentService } from './services/paymentService';
import { OrderEvents } from './events/orderEvents';

const app = express();
const PORT = process.env.PORT || 4002;

app.use(express.json());

// Initialize dependencies
const orderEvents = new OrderEvents();
const paymentService = new PaymentService();
const orderService = new OrderService(paymentService, orderEvents);
const orderController = new OrderController(orderService);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'order-service', timestamp: new Date().toISOString() });
});

// Routes
app.get('/orders', (req, res) => orderController.listOrders(req, res));
app.post('/orders', (req, res) => orderController.createOrder(req, res));
app.get('/orders/:id', (req, res) => orderController.getOrder(req, res));
app.put('/orders/:id/cancel', (req, res) => orderController.cancelOrder(req, res));

// Initialize Kafka consumer for order events
orderEvents.startConsumer().catch(err => {
  console.error('[OrderService] Failed to start Kafka consumer:', err);
});

app.listen(PORT, () => {
  console.log(`Order Service running on port ${PORT}`);
});

export default app;
