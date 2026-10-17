import { createHash, randomBytes } from "node:crypto";
import { getDb } from "./db";
import { SESSION_TTL_MS } from "./constants";
import type { SessionUser } from "./types";

// Only a SHA-256 of the token is stored, so a leaked DB can't be replayed as cookies.
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function createSessionRecord(userId: number): { token: string; expiresAt: Date } {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(new Date().toISOString());
  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(
    hashToken(token),
    userId,
    expiresAt.toISOString(),
  );
  return { token, expiresAt };
}

export function getUserByToken(token: string): SessionUser | null {
  const row = getDb()
    .prepare(
      `SELECT u.id, u.email, u.name, u.currency
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > ?`,
    )
    .get(hashToken(token), new Date().toISOString()) as SessionUser | undefined;
  return row ?? null;
}

export function deleteSessionRecord(token: string): void {
  getDb().prepare("DELETE FROM sessions WHERE id = ?").run(hashToken(token));
}
