import express from 'express';
import cors from 'cors';
import { authRoutes } from './routes/auth';
import { orderRoutes } from './routes/orders';
import { productRoutes } from './routes/products';
import { authMiddleware } from './middleware/authMiddleware';
import { rateLimiter } from './middleware/rateLimiter';

const app = express();
const PORT = process.env.PORT || 3000;

// Global middleware
app.use(cors());
app.use(express.json());
app.use(rateLimiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'api-gateway', timestamp: new Date().toISOString() });
});

// Public routes (no auth required)
app.use('/api/auth', authRoutes);

// Protected routes (auth required)
app.use('/api/orders', authMiddleware, orderRoutes);
app.use('/api/products', productRoutes);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(`[API Gateway] Error: ${err.message}`);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`User Service: ${process.env.USER_SERVICE_URL || 'http://localhost:4001'}`);
  console.log(`Order Service: ${process.env.ORDER_SERVICE_URL || 'http://localhost:4002'}`);
});

export default app;
