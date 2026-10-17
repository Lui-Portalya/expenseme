import { getDb } from "../db";
import { daysInMonth, monthBounds, shiftMonth } from "../dates";
import type { ExpenseRow } from "../types";

export function monthTotal(userId: number, month: string): number {
  const { start, end } = monthBounds(month);
  const row = getDb()
    .prepare("SELECT COALESCE(SUM(amount_cents), 0) AS t FROM expenses WHERE user_id = ? AND date >= ? AND date < ?")
    .get(userId, start, end) as { t: number };
  return row.t;
}

export function spendingByCategory(userId: number, month: string) {
  const { start, end } = monthBounds(month);
  return getDb()
    .prepare(
      `SELECT c.id, c.name, c.color, SUM(e.amount_cents) AS total_cents
       FROM expenses e JOIN categories c ON c.id = e.category_id
       WHERE e.user_id = ? AND e.date >= ? AND e.date < ?
       GROUP BY c.id ORDER BY total_cents DESC`,
    )
    .all(userId, start, end) as { id: number; name: string; color: string; total_cents: number }[];
}

/** One entry per day of the month (zero-filled). */
export function dailyTrend(userId: number, month: string): { day: number; cents: number }[] {
  const { start, end } = monthBounds(month);
  const rows = getDb()
    .prepare(
      `SELECT CAST(substr(date, 9, 2) AS INTEGER) AS day, SUM(amount_cents) AS cents
       FROM expenses WHERE user_id = ? AND date >= ? AND date < ? GROUP BY date`,
    )
    .all(userId, start, end) as { day: number; cents: number }[];
  const byDay = new Map(rows.map((r) => [r.day, r.cents]));
  return Array.from({ length: daysInMonth(month) }, (_, i) => ({ day: i + 1, cents: byDay.get(i + 1) ?? 0 }));
}

/** The last `count` months ending at `month` (zero-filled), oldest first. */
export function monthlyTrend(userId: number, month: string, count = 6): { month: string; cents: number }[] {
  const first = shiftMonth(month, -(count - 1));
  const { end } = monthBounds(month);
  const rows = getDb()
    .prepare(
      `SELECT substr(date, 1, 7) AS month, SUM(amount_cents) AS cents
       FROM expenses WHERE user_id = ? AND date >= ? AND date < ? GROUP BY substr(date, 1, 7)`,
    )
    .all(userId, `${first}-01`, end) as { month: string; cents: number }[];
  const byMonth = new Map(rows.map((r) => [r.month, r.cents]));
  return Array.from({ length: count }, (_, i) => {
    const m = shiftMonth(first, i);
    return { month: m, cents: byMonth.get(m) ?? 0 };
  });
}

export function recentExpenses(userId: number, limit = 6): ExpenseRow[] {
  return getDb()
    .prepare(
      `SELECT e.*, c.name AS category_name, c.color AS category_color
       FROM expenses e JOIN categories c ON c.id = e.category_id
       WHERE e.user_id = ? ORDER BY e.date DESC, e.id DESC LIMIT ?`,
    )
    .all(userId, limit) as ExpenseRow[];
}
