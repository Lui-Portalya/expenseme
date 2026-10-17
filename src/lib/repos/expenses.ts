import { getDb } from "../db";
import type { Expense, ExpenseRow } from "../types";

export interface ExpenseFilters {
  from?: string;
  to?: string;
  categoryId?: number;
  q?: string;
}

export type SortKey = "date" | "amount" | "description" | "category";

const SORT_COLUMNS: Record<SortKey, string> = {
  date: "e.date",
  amount: "e.amount_cents",
  description: "e.description COLLATE NOCASE",
  category: "c.name COLLATE NOCASE",
};

export const isSortKey = (s: string | undefined): s is SortKey => !!s && s in SORT_COLUMNS;

function buildWhere(userId: number, f: ExpenseFilters) {
  const clauses = ["e.user_id = @userId"];
  const params: Record<string, string | number> = { userId };
  if (f.from) {
    clauses.push("e.date >= @from");
    params.from = f.from;
  }
  if (f.to) {
    clauses.push("e.date <= @to");
    params.to = f.to;
  }
  if (f.categoryId) {
    clauses.push("e.category_id = @categoryId");
    params.categoryId = f.categoryId;
  }
  if (f.q) {
    clauses.push("(e.description LIKE @q OR e.notes LIKE @q)");
    params.q = `%${f.q}%`;
  }
  return { where: clauses.join(" AND "), params };
}

const SELECT = `SELECT e.*, c.name AS category_name, c.color AS category_color
                FROM expenses e JOIN categories c ON c.id = e.category_id`;

export function listExpenses(
  userId: number,
  filters: ExpenseFilters,
  opts: { sort?: SortKey; dir?: "asc" | "desc"; page?: number; pageSize?: number } = {},
): { rows: ExpenseRow[]; total: number } {
  const { sort = "date", dir = "desc", page = 1, pageSize = 20 } = opts;
  const { where, params } = buildWhere(userId, filters);
  const db = getDb();

  const total = (
    db
      .prepare(`SELECT COUNT(*) AS n FROM expenses e JOIN categories c ON c.id = e.category_id WHERE ${where}`)
      .get(params) as { n: number }
  ).n;

  const rows = db
    .prepare(
      `${SELECT} WHERE ${where}
       ORDER BY ${SORT_COLUMNS[sort]} ${dir === "asc" ? "ASC" : "DESC"}, e.id DESC
       LIMIT @limit OFFSET @offset`,
    )
    .all({ ...params, limit: pageSize, offset: (Math.max(1, page) - 1) * pageSize }) as ExpenseRow[];

  return { rows, total };
}

export function listAllExpenses(userId: number, filters: ExpenseFilters): ExpenseRow[] {
  const { where, params } = buildWhere(userId, filters);
  return getDb().prepare(`${SELECT} WHERE ${where} ORDER BY e.date DESC, e.id DESC`).all(params) as ExpenseRow[];
}

export function getExpense(userId: number, id: number): Expense | undefined {
  return getDb().prepare("SELECT * FROM expenses WHERE id = ? AND user_id = ?").get(id, userId) as
    | Expense
    | undefined;
}

export interface ExpenseInput {
  categoryId: number;
  amountCents: number;
  description: string;
  date: string;
  notes?: string | null;
}

export function createExpense(userId: number, input: ExpenseInput): number {
  const r = getDb()
    .prepare(
      `INSERT INTO expenses (user_id, category_id, amount_cents, description, date, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(userId, input.categoryId, input.amountCents, input.description, input.date, input.notes || null);
  return Number(r.lastInsertRowid);
}

export function updateExpense(userId: number, id: number, input: ExpenseInput): boolean {
  const r = getDb()
    .prepare(
      `UPDATE expenses SET category_id = ?, amount_cents = ?, description = ?, date = ?, notes = ?,
         updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`,
    )
    .run(input.categoryId, input.amountCents, input.description, input.date, input.notes || null, id, userId);
  return r.changes > 0;
}

export function deleteExpense(userId: number, id: number): boolean {
  return getDb().prepare("DELETE FROM expenses WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
}
