import { User, CreateUserInput } from '../models/user';

/**
 * UserRepository handles data access for the users table in PostgreSQL.
 * Provides CRUD operations with parameterized queries to prevent SQL injection.
 */
export class UserRepository {
  // In-memory store for mock (production would use pg Pool)
  private users: Map<string, User> = new Map();
  private nextId = 1;

  async create(input: CreateUserInput): Promise<User> {
    const id = `user-${this.nextId++}`;
    const user: User = { ...input, id };
    this.users.set(id, user);

    // In production: INSERT INTO users (email, password_hash, name, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    console.log(`[UserRepository] Created user ${id}: ${input.email}`);
    return user;
  }

  async findById(id: string): Promise<User | null> {
    // In production: SELECT * FROM users WHERE id = $1
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    // In production: SELECT * FROM users WHERE email = $1
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return null;
  }

  async update(id: string, updates: Partial<User>): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) return null;

    const updated = { ...user, ...updates };
    this.users.set(id, updated);

    // In production: UPDATE users SET name = $2, updated_at = $3 WHERE id = $1 RETURNING *
    console.log(`[UserRepository] Updated user ${id}`);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    // In production: DELETE FROM users WHERE id = $1
    return this.users.delete(id);
  }

  async countAll(): Promise<number> {
    // In production: SELECT COUNT(*) FROM users
    return this.users.size;
  }
}
