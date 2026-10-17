import { getDb } from "../db";
import { monthBounds } from "../dates";
import type { BudgetRow } from "../types";

/** Budgets for a month with spending computed. categoryId null = overall monthly budget. */
export function listBudgets(userId: number, month: string): BudgetRow[] {
  const { start, end } = monthBounds(month);
  return getDb()
    .prepare(
      `SELECT b.id, b.category_id, c.name AS category_name, c.color, b.limit_cents,
         COALESCE((
           SELECT SUM(e.amount_cents) FROM expenses e
           WHERE e.user_id = b.user_id AND e.date >= @start AND e.date < @end
             AND (b.category_id IS NULL OR e.category_id = b.category_id)
         ), 0) AS spent_cents
       FROM budgets b LEFT JOIN categories c ON c.id = b.category_id
       WHERE b.user_id = @userId AND b.month = @month
       ORDER BY b.category_id IS NOT NULL, c.name COLLATE NOCASE`,
    )
    .all({ userId, month, start, end }) as BudgetRow[];
}

/** Insert or replace the budget for (user, month, category). */
export function setBudget(userId: number, month: string, categoryId: number | null, limitCents: number): void {
  const db = getDb();
  db.transaction(() => {
    db.prepare("DELETE FROM budgets WHERE user_id = ? AND month = ? AND category_id IS ?").run(
      userId,
      month,
      categoryId,
    );
    db.prepare("INSERT INTO budgets (user_id, category_id, month, limit_cents) VALUES (?, ?, ?, ?)").run(
      userId,
      categoryId,
      month,
      limitCents,
    );
  })();
}

export function deleteBudget(userId: number, id: number): void {
  getDb().prepare("DELETE FROM budgets WHERE id = ? AND user_id = ?").run(id, userId);
}
