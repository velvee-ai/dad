/**
 * User entity representing a registered user in the system.
 * Maps to the `users` table in PostgreSQL.
 */
export interface User {
  id?: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'customer' | 'admin' | 'support';
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

/**
 * Public user profile (excludes sensitive fields like passwordHash).
 */
export type UserProfile = Omit<User, 'passwordHash'>;

/**
 * Input for creating a new user.
 */
export type CreateUserInput = Omit<User, 'id'>;

/**
 * Input for updating a user (all fields optional).
 */
export type UpdateUserInput = Partial<Omit<User, 'id' | 'email'>>;
