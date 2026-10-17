import { getDb } from "../db";
import { DEFAULT_CATEGORIES } from "../constants";

export interface UserWithHash {
  id: number;
  email: string;
  name: string;
  currency: string;
  password_hash: string;
}

export function getUserByEmail(email: string): UserWithHash | undefined {
  return getDb().prepare("SELECT * FROM users WHERE email = ?").get(email) as UserWithHash | undefined;
}

export function getUserById(id: number): UserWithHash | undefined {
  return getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserWithHash | undefined;
}

/** Creates the user and seeds default categories atomically. Throws on duplicate email. */
export function createUser(input: { email: string; name: string; passwordHash: string }): number {
  const db = getDb();
  const tx = db.transaction(() => {
    const { lastInsertRowid } = db
      .prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)")
      .run(input.email, input.name, input.passwordHash);
    const userId = Number(lastInsertRowid);
    const insert = db.prepare("INSERT INTO categories (user_id, name, color) VALUES (?, ?, ?)");
    for (const c of DEFAULT_CATEGORIES) insert.run(userId, c.name, c.color);
    return userId;
  });
  return tx();
}

export function updateProfile(userId: number, name: string, currency: string): void {
  getDb().prepare("UPDATE users SET name = ?, currency = ? WHERE id = ?").run(name, currency, userId);
}

export function updatePasswordHash(userId: number, passwordHash: string): void {
  getDb().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, userId);
}
