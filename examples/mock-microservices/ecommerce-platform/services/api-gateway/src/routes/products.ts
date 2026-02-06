import { Router, Request, Response } from 'express';

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:4002';

export const productRoutes = Router();

// In-memory product catalog (would be its own service in a real system)
const products = [
  { id: 'prod-1', name: 'Wireless Headphones', price: 79.99, category: 'electronics', stock: 150 },
  { id: 'prod-2', name: 'Running Shoes', price: 129.99, category: 'sports', stock: 80 },
  { id: 'prod-3', name: 'Coffee Maker', price: 49.99, category: 'kitchen', stock: 200 },
  { id: 'prod-4', name: 'Laptop Stand', price: 34.99, category: 'electronics', stock: 300 },
  { id: 'prod-5', name: 'Yoga Mat', price: 24.99, category: 'sports', stock: 500 },
];

/**
 * GET /api/products
 * Lists products with optional category filter and search
 */
productRoutes.get('/', (req: Request, res: Response) => {
  const { category, search, page = '1', limit = '20' } = req.query;

  let filtered = [...products];

  if (category) {
    filtered = filtered.filter(p => p.category === String(category));
  }

  if (search) {
    const searchStr = String(search).toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(searchStr));
  }

  const pageNum = parseInt(String(page), 10);
  const limitNum = parseInt(String(limit), 10);
  const start = (pageNum - 1) * limitNum;
  const paginated = filtered.slice(start, start + limitNum);

  return res.json({
    products: paginated,
    total: filtered.length,
    page: pageNum,
    totalPages: Math.ceil(filtered.length / limitNum),
  });
});

/**
 * GET /api/products/:id
 * Gets a single product by ID
 */
productRoutes.get('/:id', (req: Request, res: Response) => {
  const product = products.find(p => p.id === req.params.id);

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  return res.json(product);
});
