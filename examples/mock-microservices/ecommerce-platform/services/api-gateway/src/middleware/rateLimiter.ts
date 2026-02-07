import rateLimit from 'express-rate-limit';
import { Request } from 'express';

/**
 * Global rate limiter applied to all routes.
 * Limits each IP to 100 requests per 15-minute window.
 * Authenticated users get a higher limit (managed by API key tier).
 */
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req: Request) => {
    // Authenticated users get higher limits
    if ((req as any).userId) {
      return 1000;
    }
    return 100;
  },
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use X-Forwarded-For behind a load balancer, fallback to IP
    return req.headers['x-forwarded-for'] as string || req.ip || 'unknown';
  },
});

/**
 * Stricter rate limiter for authentication endpoints.
 * Prevents brute-force login attempts.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 login attempts per 15 minutes
  message: {
    error: 'Too many login attempts',
    message: 'Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
