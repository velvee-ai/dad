import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Middleware that validates JWT tokens from the Authorization header.
 * Extracts userId and attaches it to the request for downstream handlers.
 * Returns 401 if token is missing, expired, or invalid.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (req as any).userId = decoded.userId;
    (req as any).userEmail = decoded.email;
    (req as any).userRole = decoded.role;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token', code: 'TOKEN_INVALID' });
      return;
    }
    res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * Middleware that requires a specific role.
 * Must be used after authMiddleware.
 */
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = (req as any).userRole;
    if (userRole !== role && userRole !== 'admin') {
      res.status(403).json({ error: 'Insufficient permissions', required: role });
      return;
    }
    next();
  };
}
