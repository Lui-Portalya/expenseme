import { expect, type Page } from "@playwright/test";

export const PASSWORD = "e2e-test-password-1";

export const uniqueEmail = (tag: string) => `${tag}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@example.test`;

export async function register(page: Page, email: string, name = "E2E User") {
  await page.goto("/register");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

export async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function addExpense(page: Page, e: { amount: string; description: string; category: string; notes?: string }) {
  await page.goto("/expenses/new");
  await page.getByLabel("Amount").fill(e.amount);
  await page.getByLabel("Description").fill(e.description);
  await page.getByLabel("Category").selectOption({ label: e.category });
  if (e.notes) await page.getByLabel("Notes (optional)").fill(e.notes);
  await page.getByRole("button", { name: "Add expense" }).click();
  await expect(page).toHaveURL(/\/expenses$/);
}

/** The app's inline alert (excludes Next's built-in route announcer, which also has role=alert). */
export const alert = (page: Page) => page.locator("[role=alert]:not(#__next-route-announcer__)");
