import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/userRepository';
import { EmailService } from './emailService';
import { User } from '../models/user';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRY = '1h';
const REFRESH_EXPIRY = '7d';
const SALT_ROUNDS = 12;

/**
 * UserService contains the core business logic for user operations.
 * Handles registration, authentication, token management, and profile updates.
 * Publishes events to Kafka for cross-service communication.
 */
export class UserService {
  constructor(
    private userRepo: UserRepository,
    private emailService: EmailService,
  ) {}

  async registerUser(email: string, password: string, name: string): Promise<{ user: Omit<User, 'passwordHash'>; token: string }> {
    // Check if user already exists
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw new Error('USER_EXISTS');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = await this.userRepo.create({
      email,
      passwordHash,
      name,
      role: 'customer',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Generate JWT
    const token = this.generateToken(user);

    // Send welcome email (async, don't block registration)
    this.emailService.sendWelcomeEmail(user.email, user.name).catch(err => {
      console.error('[UserService] Failed to send welcome email:', err);
    });

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  async loginUser(email: string, password: string): Promise<{ token: string; refreshToken: string; user: Omit<User, 'passwordHash'> } | null> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;

    const token = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Update last login timestamp
    await this.userRepo.update(user.id!, { lastLoginAt: new Date() });

    const { passwordHash: _, ...safeUser } = user;
    return { token, refreshToken, user: safeUser };
  }

  async refreshToken(refreshToken: string): Promise<{ token: string } | null> {
    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET) as { userId: string; type: string };
      if (decoded.type !== 'refresh') return null;

      const user = await this.userRepo.findById(decoded.userId);
      if (!user) return null;

      const token = this.generateToken(user);
      return { token };
    } catch {
      return null;
    }
  }

  async getUserById(id: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await this.userRepo.findById(id);
    if (!user) return null;

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async updateUser(id: string, updates: Partial<Pick<User, 'name' | 'email'>>): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await this.userRepo.update(id, { ...updates, updatedAt: new Date() });
    if (!user) return null;

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  private generateToken(user: User): string {
    return jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY },
    );
  }

  private generateRefreshToken(user: User): string {
    return jwt.sign(
      { userId: user.id, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: REFRESH_EXPIRY },
    );
  }
}
