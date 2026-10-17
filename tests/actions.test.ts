import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.EXPENSEME_DB = ":memory:";

// --- Minimal stand-ins for Next's request-scoped APIs -------------------------------------------
const jar = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
    has: (name: string) => jar.has(name),
  }),
}));

class RedirectError extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT ${url}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
}));
// ------------------------------------------------------------------------------------------------

import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { loginAction, logoutAction, registerAction } from "@/lib/actions/auth";
import { createExpenseAction, deleteExpenseAction, updateExpenseAction } from "@/lib/actions/expenses";
import { createCategoryAction, deleteCategoryAction } from "@/lib/actions/categories";
import { deleteBudgetAction, setBudgetAction } from "@/lib/actions/budgets";
import { changePasswordAction, updateProfileAction } from "@/lib/actions/settings";
import { listCategories } from "@/lib/repos/categories";
import { getExpense, listExpenses } from "@/lib/repos/expenses";
import { listBudgets } from "@/lib/repos/budgets";
import { getUserByEmail } from "@/lib/repos/users";

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

/** Runs an action and returns either its result or the redirect URL it threw. */
async function run<T>(fn: () => Promise<T>): Promise<{ result?: T; redirect?: string }> {
  try {
    return { result: await fn() };
  } catch (e) {
    if (e instanceof RedirectError) return { redirect: e.url };
    throw e;
  }
}

const PASSWORD = "correct-horse-battery";
let counter = 0;

async function signUp(name = "Test") {
  const email = `user${++counter}@example.test`;
  const r = await run(() => registerAction({}, form({ name, email, password: PASSWORD })));
  expect(r.redirect).toBe("/");
  return { email, user: (await getCurrentUser())! };
}

beforeEach(() => {
  jar.clear();
});

describe("password hashing", () => {
  it("verifies correct passwords and rejects wrong or missing hashes", async () => {
    const hash = await hashPassword("secret-pass-1");
    expect(hash).not.toContain("secret-pass-1");
    expect(await verifyPassword("secret-pass-1", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
    expect(await verifyPassword("anything", undefined)).toBe(false);
  });
});

describe("registerAction", () => {
  it("creates the account, starts a session and seeds categories", async () => {
    const { email, user } = await signUp("Ada");
    expect(user.email).toBe(email);
    expect(jar.has(SESSION_COOKIE)).toBe(true);
    expect(listCategories(user.id)).toHaveLength(8);
    expect(getUserByEmail(email)?.password_hash).not.toBe(PASSWORD);
  });

  it("rejects a short password and an invalid email without creating a user", async () => {
    const r = await registerAction({}, form({ name: "X", email: "nope", password: "short" }));
    expect(r.fieldErrors?.email).toBeDefined();
    expect(r.fieldErrors?.password).toBeDefined();
    expect(jar.has(SESSION_COOKIE)).toBe(false);
  });

  it("rejects a duplicate email, ignoring case", async () => {
    const { email } = await signUp();
    jar.clear();
    const r = await registerAction({}, form({ name: "Dup", email: email.toUpperCase(), password: PASSWORD }));
    expect(r.fieldErrors?.email?.[0]).toMatch(/already exists/);
    expect(jar.has(SESSION_COOKIE)).toBe(false);
  });
});

describe("loginAction / logoutAction", () => {
  it("logs in with correct credentials", async () => {
    const { email, user } = await signUp();
    jar.clear();
    const r = await run(() => loginAction({}, form({ email, password: PASSWORD })));
    expect(r.redirect).toBe("/");
    expect((await getCurrentUser())?.id).toBe(user.id);
  });

  it("gives the same generic error for a wrong password and an unknown email", async () => {
    const { email } = await signUp();
    jar.clear();
    const wrong = await loginAction({}, form({ email, password: "wrong-password" }));
    const unknown = await loginAction({}, form({ email: "ghost@example.test", password: PASSWORD }));
    expect(wrong.error).toBe("Invalid email or password.");
    expect(unknown.error).toBe(wrong.error);
    expect(jar.has(SESSION_COOKIE)).toBe(false);
  });

  it("logout revokes the session server-side, not just the cookie", async () => {
    await signUp();
    const token = jar.get(SESSION_COOKIE)!;
    const r = await run(() => logoutAction());
    expect(r.redirect).toBe("/login");
    expect(jar.has(SESSION_COOKIE)).toBe(false);
    jar.set(SESSION_COOKIE, token); // replay the old cookie
    expect(await getCurrentUser()).toBeNull();
  });
});

describe("expense actions", () => {
  const valid = (categoryId: number) => ({
    amount: "12.34",
    categoryId: String(categoryId),
    date: "2026-03-10",
    description: "Lunch",
    notes: "",
  });

  it("requires a session", async () => {
    const r = await run(() => createExpenseAction({}, form(valid(1))));
    expect(r.redirect).toBe("/login");
  });

  it("creates an expense in cents and redirects to the list", async () => {
    const { user } = await signUp();
    const cat = listCategories(user.id)[0].id;
    const r = await run(() => createExpenseAction({}, form(valid(cat))));
    expect(r.redirect).toBe("/expenses");
    expect(listExpenses(user.id, {}).rows[0]).toMatchObject({ amount_cents: 1234, description: "Lunch" });
  });

  it("returns field errors for bad amount, date and description", async () => {
    const { user } = await signUp();
    const cat = listCategories(user.id)[0].id;
    const r = await createExpenseAction(
      {},
      form({ ...valid(cat), amount: "-5", date: "2026-02-31", description: "  " }),
    );
    expect(r.fieldErrors).toMatchObject({ amount: expect.any(Array), date: expect.any(Array), description: expect.any(Array) });
    expect(listExpenses(user.id, {}).total).toBe(0);
  });

  it("refuses to use another user's category", async () => {
    const alice = await signUp();
    const aliceCat = listCategories(alice.user.id)[0].id;
    await signUp();
    const r = await createExpenseAction({}, form(valid(aliceCat)));
    expect(r.fieldErrors?.categoryId).toBeDefined();
  });

  it("cannot update or delete another user's expense", async () => {
    const alice = await signUp();
    await run(() => createExpenseAction({}, form(valid(listCategories(alice.user.id)[0].id))));
    const expenseId = listExpenses(alice.user.id, {}).rows[0].id;

    const bob = await signUp();
    const bobCat = listCategories(bob.user.id)[0].id;
    const upd = await updateExpenseAction(expenseId, {}, form({ ...valid(bobCat), description: "Hacked" }));
    expect(upd.error).toBe("Expense not found.");
    await run(() => deleteExpenseAction(expenseId));

    expect(getExpense(alice.user.id, expenseId)?.description).toBe("Lunch");
  });

  it("updates and deletes the owner's own expense", async () => {
    const { user } = await signUp();
    const cat = listCategories(user.id)[0].id;
    await run(() => createExpenseAction({}, form(valid(cat))));
    const id = listExpenses(user.id, {}).rows[0].id;

    expect((await run(() => updateExpenseAction(id, {}, form({ ...valid(cat), amount: "99" })))).redirect).toBe("/expenses");
    expect(getExpense(user.id, id)?.amount_cents).toBe(9900);

    await run(() => deleteExpenseAction(id));
    expect(getExpense(user.id, id)).toBeUndefined();
  });
});

describe("category actions", () => {
  it("creates a category and surfaces duplicate / in-use errors via redirect", async () => {
    const { user } = await signUp();
    expect((await run(() => createCategoryAction(form({ name: "Pets", color: "#112233" })))).redirect).toBe("/categories");

    const dup = await run(() => createCategoryAction(form({ name: "Pets", color: "#112233" })));
    expect(decodeURIComponent(dup.redirect!)).toMatch(/already exists/);

    const bad = await run(() => createCategoryAction(form({ name: "X", color: "red" })));
    expect(decodeURIComponent(bad.redirect!)).toMatch(/valid color/);

    const food = listCategories(user.id).find((c) => c.name === "Food")!;
    await run(() =>
      createExpenseAction({}, form({ amount: "1", categoryId: String(food.id), date: "2026-03-10", description: "x" })),
    );
    const inUse = await run(() => deleteCategoryAction(food.id));
    expect(decodeURIComponent(inUse.redirect!)).toMatch(/used by 1 expense/);
  });
});

describe("budget actions", () => {
  it("sets, replaces and deletes budgets, and rejects unknown categories", async () => {
    const { user } = await signUp();
    const cat = listCategories(user.id)[0].id;

    await run(() => setBudgetAction(form({ month: "2026-03", categoryId: "", limit: "500" })));
    await run(() => setBudgetAction(form({ month: "2026-03", categoryId: String(cat), limit: "100" })));
    await run(() => setBudgetAction(form({ month: "2026-03", categoryId: String(cat), limit: "150" })));
    const budgets = listBudgets(user.id, "2026-03");
    expect(budgets).toHaveLength(2);
    expect(budgets.find((b) => b.category_id === cat)?.limit_cents).toBe(15000);

    const bad = await run(() => setBudgetAction(form({ month: "2026-03", categoryId: "999999", limit: "10" })));
    expect(decodeURIComponent(bad.redirect!)).toMatch(/Unknown category/);

    const zero = await run(() => setBudgetAction(form({ month: "2026-03", categoryId: "", limit: "0" })));
    expect(decodeURIComponent(zero.redirect!)).toMatch(/valid limit/);

    await run(() => deleteBudgetAction(budgets[0].id, "2026-03"));
    expect(listBudgets(user.id, "2026-03")).toHaveLength(1);
  });

  it("cannot delete another user's budget", async () => {
    const alice = await signUp();
    await run(() => setBudgetAction(form({ month: "2026-04", categoryId: "", limit: "50" })));
    const id = listBudgets(alice.user.id, "2026-04")[0].id;
    await signUp();
    await run(() => deleteBudgetAction(id, "2026-04"));
    expect(listBudgets(alice.user.id, "2026-04")).toHaveLength(1);
  });
});

describe("settings actions", () => {
  it("updates profile and rejects unsupported currencies", async () => {
    const { user } = await signUp();
    expect((await updateProfileAction({}, form({ name: "New Name", currency: "EUR" }))).ok).toBe(true);
    expect(getUserByEmail(user.email)).toMatchObject({ name: "New Name", currency: "EUR" });
    expect((await updateProfileAction({}, form({ name: "N", currency: "XXX" }))).fieldErrors?.currency).toBeDefined();
  });

  it("changes password only with the correct current password, and the new one works for login", async () => {
    const { email } = await signUp();
    const bad = await changePasswordAction({}, form({ current: "nope", next: "brand-new-pass", confirm: "brand-new-pass" }));
    expect(bad.fieldErrors?.current).toBeDefined();

    const mismatch = await changePasswordAction({}, form({ current: PASSWORD, next: "brand-new-pass", confirm: "different" }));
    expect(mismatch.fieldErrors?.confirm).toBeDefined();

    expect((await changePasswordAction({}, form({ current: PASSWORD, next: "brand-new-pass", confirm: "brand-new-pass" }))).ok).toBe(true);

    jar.clear();
    expect((await loginAction({}, form({ email, password: PASSWORD }))).error).toBeDefined();
    expect((await run(() => loginAction({}, form({ email, password: "brand-new-pass" })))).redirect).toBe("/");
  });
});

describe("data hygiene", () => {
  it("never stores plaintext passwords", () => {
    const rows = getDb().prepare("SELECT password_hash FROM users").all() as { password_hash: string }[];
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.password_hash).toMatch(/^\$2[aby]\$/);
  });
});
