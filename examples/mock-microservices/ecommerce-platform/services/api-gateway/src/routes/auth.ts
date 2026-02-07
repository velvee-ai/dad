import { Router, Request, Response } from 'express';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:4001';

export const authRoutes = Router();

/**
 * POST /api/auth/register
 * Proxies registration request to user-service
 */
authRoutes.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields: email, password, name' });
    }

    const response = await fetch(`${USER_SERVICE_URL}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('[Auth Route] Registration error:', error);
    return res.status(502).json({ error: 'User service unavailable' });
  }
});

/**
 * POST /api/auth/login
 * Proxies login request to user-service, returns JWT
 */
authRoutes.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing required fields: email, password' });
    }

    const response = await fetch(`${USER_SERVICE_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('[Auth Route] Login error:', error);
    return res.status(502).json({ error: 'User service unavailable' });
  }
});

/**
 * POST /api/auth/refresh
 * Refreshes an expired JWT token
 */
authRoutes.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Missing refresh token' });
    }

    const response = await fetch(`${USER_SERVICE_URL}/users/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('[Auth Route] Refresh error:', error);
    return res.status(502).json({ error: 'User service unavailable' });
  }
});
