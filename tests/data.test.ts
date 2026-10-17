import { beforeAll, describe, expect, it } from "vitest";

process.env.EXPENSEME_DB = ":memory:";

import { createSessionRecord, deleteSessionRecord, getUserByToken } from "@/lib/sessions";
import { createUser, getUserByEmail } from "@/lib/repos/users";
import { createCategory, deleteCategory, listCategories } from "@/lib/repos/categories";
import { createExpense, deleteExpense, getExpense, listExpenses, updateExpense } from "@/lib/repos/expenses";
import { listBudgets, setBudget } from "@/lib/repos/budgets";
import { dailyTrend, monthTotal, monthlyTrend, spendingByCategory } from "@/lib/repos/stats";
import { getDb } from "@/lib/db";

let alice: number;
let bob: number;
let aliceFood: number;

beforeAll(() => {
  alice = createUser({ email: "alice@example.com", name: "Alice", passwordHash: "x" });
  bob = createUser({ email: "bob@example.com", name: "Bob", passwordHash: "x" });
  aliceFood = listCategories(alice).find((c) => c.name === "Food")!.id;
});

describe("users", () => {
  it("seeds default categories and matches emails case-insensitively", () => {
    expect(listCategories(alice).length).toBe(8);
    expect(getUserByEmail("ALICE@example.com")?.id).toBe(alice);
  });
  it("rejects duplicate emails", () => {
    expect(() => createUser({ email: "alice@example.com", name: "Dup", passwordHash: "x" })).toThrow();
  });
});

describe("sessions", () => {
  it("resolves a valid token, stores only its hash, and revokes on delete", () => {
    const { token } = createSessionRecord(alice);
    expect(getUserByToken(token)?.id).toBe(alice);
    const stored = getDb().prepare("SELECT id FROM sessions").all() as { id: string }[];
    expect(stored.some((s) => s.id === token)).toBe(false);
    deleteSessionRecord(token);
    expect(getUserByToken(token)).toBeNull();
  });
  it("rejects expired sessions", () => {
    const { token } = createSessionRecord(alice);
    getDb().prepare("UPDATE sessions SET expires_at = ?").run(new Date(Date.now() - 1000).toISOString());
    expect(getUserByToken(token)).toBeNull();
  });
});

describe("expenses", () => {
  it("creates, filters, updates and deletes", () => {
    const id = createExpense(alice, { categoryId: aliceFood, amountCents: 1250, description: "Lunch", date: "2026-03-05" });
    createExpense(alice, { categoryId: aliceFood, amountCents: 500, description: "Coffee", date: "2026-03-06" });

    expect(listExpenses(alice, {}).total).toBe(2);
    expect(listExpenses(alice, { q: "lunch" }).rows.map((r) => r.id)).toEqual([id]);
    expect(listExpenses(alice, { from: "2026-03-06" }).total).toBe(1);
    expect(listExpenses(alice, {}, { sort: "amount", dir: "asc" }).rows[0].description).toBe("Coffee");

    expect(updateExpense(alice, id, { categoryId: aliceFood, amountCents: 999, description: "Lunch!", date: "2026-03-05" })).toBe(true);
    expect(getExpense(alice, id)?.amount_cents).toBe(999);
    expect(deleteExpense(alice, id)).toBe(true);
    expect(getExpense(alice, id)).toBeUndefined();
  });

  it("never exposes or mutates another user's data", () => {
    const id = createExpense(alice, { categoryId: aliceFood, amountCents: 100, description: "Private", date: "2026-04-01" });
    expect(getExpense(bob, id)).toBeUndefined();
    expect(listExpenses(bob, {}).total).toBe(0);
    expect(deleteExpense(bob, id)).toBe(false);
    expect(updateExpense(bob, id, { categoryId: aliceFood, amountCents: 1, description: "x", date: "2026-04-01" })).toBe(false);
    expect(getExpense(alice, id)?.description).toBe("Private");
  });
});

describe("categories", () => {
  it("blocks duplicates and deleting categories in use", () => {
    expect(createCategory(alice, "Food", "#000000").ok).toBe(false);
    expect(createCategory(alice, "Pets", "#123456").ok).toBe(true);
    const res = deleteCategory(alice, aliceFood);
    expect(res.ok).toBe(false);
  });
});

describe("stats and budgets", () => {
  it("aggregates a month and computes budget spend", () => {
    createExpense(bob, { categoryId: listCategories(bob)[0].id, amountCents: 2000, description: "A", date: "2026-05-02" });
    createExpense(bob, { categoryId: listCategories(bob)[0].id, amountCents: 3000, description: "B", date: "2026-05-02" });
    createExpense(bob, { categoryId: listCategories(bob)[1].id, amountCents: 500, description: "C", date: "2026-06-01" });

    expect(monthTotal(bob, "2026-05")).toBe(5000);
    expect(spendingByCategory(bob, "2026-05")).toHaveLength(1);
    expect(dailyTrend(bob, "2026-05")).toHaveLength(31);
    expect(dailyTrend(bob, "2026-05")[1].cents).toBe(5000);
    expect(monthlyTrend(bob, "2026-06", 3).map((m) => m.cents)).toEqual([0, 5000, 500]);

    const cat = listCategories(bob)[0].id;
    setBudget(bob, "2026-05", null, 10000);
    setBudget(bob, "2026-05", cat, 4000);
    setBudget(bob, "2026-05", cat, 4500); // replaces
    const budgets = listBudgets(bob, "2026-05");
    expect(budgets).toHaveLength(2);
    expect(budgets.find((b) => b.category_id === null)?.spent_cents).toBe(5000);
    expect(budgets.find((b) => b.category_id === cat)?.limit_cents).toBe(4500);
  });
});
