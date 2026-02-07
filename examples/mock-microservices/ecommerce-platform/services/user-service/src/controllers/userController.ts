import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

/**
 * UserController handles HTTP endpoints for user operations.
 * Validates input, delegates to UserService, and formats responses.
 */
export class UserController {
  constructor(private userService: UserService) {}

  async register(req: Request, res: Response): Promise<void> {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
      }

      const result = await this.userService.registerUser(parsed.data.email, parsed.data.password, parsed.data.name);
      res.status(201).json(result);
    } catch (error: any) {
      if (error.message === 'USER_EXISTS') {
        res.status(409).json({ error: 'User already exists with this email' });
        return;
      }
      console.error('[UserController] Register error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
      }

      const result = await this.userService.loginUser(parsed.data.email, parsed.data.password);
      if (!result) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      res.json(result);
    } catch (error) {
      console.error('[UserController] Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({ error: 'Missing refresh token' });
        return;
      }

      const result = await this.userService.refreshToken(refreshToken);
      if (!result) {
        res.status(401).json({ error: 'Invalid or expired refresh token' });
        return;
      }

      res.json(result);
    } catch (error) {
      console.error('[UserController] Refresh error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = await this.userService.getUserById(req.params.id);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.json(user);
    } catch (error) {
      console.error('[UserController] GetProfile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const updated = await this.userService.updateUser(req.params.id, req.body);
      if (!updated) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.json(updated);
    } catch (error) {
      console.error('[UserController] UpdateProfile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
