import { getDb } from "../db";
import type { Category } from "../types";

export function listCategories(userId: number): Category[] {
  return getDb()
    .prepare("SELECT * FROM categories WHERE user_id = ? ORDER BY name COLLATE NOCASE")
    .all(userId) as Category[];
}

export function listCategoriesWithCounts(userId: number): (Category & { expense_count: number })[] {
  return getDb()
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM expenses e WHERE e.category_id = c.id) AS expense_count
       FROM categories c WHERE c.user_id = ? ORDER BY c.name COLLATE NOCASE`,
    )
    .all(userId) as (Category & { expense_count: number })[];
}

export function getCategory(userId: number, id: number): Category | undefined {
  return getDb().prepare("SELECT * FROM categories WHERE id = ? AND user_id = ?").get(id, userId) as
    | Category
    | undefined;
}

export type CategoryResult = { ok: true } | { ok: false; error: string };

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Error && "code" in e && String((e as { code: unknown }).code).startsWith("SQLITE_CONSTRAINT");
}

export function createCategory(userId: number, name: string, color: string): CategoryResult {
  try {
    getDb().prepare("INSERT INTO categories (user_id, name, color) VALUES (?, ?, ?)").run(userId, name, color);
    return { ok: true };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: `A category named "${name}" already exists.` };
    throw e;
  }
}

export function updateCategory(userId: number, id: number, name: string, color: string): CategoryResult {
  try {
    const r = getDb()
      .prepare("UPDATE categories SET name = ?, color = ? WHERE id = ? AND user_id = ?")
      .run(name, color, id, userId);
    return r.changes ? { ok: true } : { ok: false, error: "Category not found." };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: `A category named "${name}" already exists.` };
    throw e;
  }
}

export function deleteCategory(userId: number, id: number): CategoryResult {
  const db = getDb();
  const used = db
    .prepare("SELECT COUNT(*) AS n FROM expenses WHERE category_id = ? AND user_id = ?")
    .get(id, userId) as { n: number };
  if (used.n > 0) {
    return { ok: false, error: `Category is used by ${used.n} expense(s). Re-categorize them first.` };
  }
  const r = db.prepare("DELETE FROM categories WHERE id = ? AND user_id = ?").run(id, userId);
  return r.changes ? { ok: true } : { ok: false, error: "Category not found." };
}
