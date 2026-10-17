import { expect, test } from "@playwright/test";
import { PASSWORD, addExpense, alert, login, register, uniqueEmail } from "./helpers";

test.describe("authentication", () => {
  test("redirects unauthenticated visitors to the login view", async ({ page }) => {
    for (const path of ["/", "/expenses", "/budgets", "/settings"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    }
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("register, sign out, reject bad credentials, sign back in", async ({ page }) => {
    const email = uniqueEmail("auth");
    await register(page, email, "Ada Lovelace");
    await expect(page.getByText("Ada Lovelace").first()).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).first().click();
    await expect(page).toHaveURL(/\/login$/);

    await login(page, email, "wrong-password");
    await expect(alert(page)).toHaveText("Invalid email or password.");
    await expect(page).toHaveURL(/\/login$/);

    await login(page, email);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("registration validates input and rejects duplicate emails", async ({ page }) => {
    const email = uniqueEmail("dup");
    await register(page, email);
    await page.getByRole("button", { name: "Sign out" }).first().click();

    await page.goto("/register");
    await page.getByLabel("Name").fill("Someone");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("An account with this email already exists.")).toBeVisible();
  });

  test("a signed-in user is bounced away from the login page", async ({ page }) => {
    await register(page, uniqueEmail("bounce"));
    await page.goto("/login");
    await expect(page).toHaveURL(/localhost:\d+\/$/);
  });
});

test.describe("expenses", () => {
  test("add, view on dashboard, edit, search and delete", async ({ page }) => {
    await register(page, uniqueEmail("exp"));
    await addExpense(page, { amount: "42.50", description: "Weekly groceries", category: "Food", notes: "Farmers market" });

    await expect(page.getByRole("row", { name: /Weekly groceries/ })).toContainText("$42.50");
    await expect(page.getByText("1 expense", { exact: true })).toBeVisible();

    await page.goto("/");
    await expect(page.getByText("$42.50").first()).toBeVisible();
    await expect(page.getByText("Weekly groceries")).toBeVisible();

    await page.goto("/expenses");
    await page.getByRole("link", { name: "Edit" }).click();
    await page.getByLabel("Amount").fill("50");
    await page.getByLabel("Description").fill("Groceries + wine");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("row", { name: /Groceries \+ wine/ })).toContainText("$50.00");

    await page.getByPlaceholder("Search…").fill("nothing-matches");
    await page.getByRole("button", { name: "Filter" }).click();
    await expect(page.getByText("No expenses found.")).toBeVisible();
    await page.getByRole("link", { name: "Reset" }).click();

    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("No expenses found.")).toBeVisible();
  });

  test("shows validation errors and keeps the form open", async ({ page }) => {
    await register(page, uniqueEmail("val"));
    await page.goto("/expenses/new");
    await page.getByLabel("Amount").fill("abc");
    await page.getByLabel("Description").fill("Bad amount");
    await page.getByLabel("Category").selectOption({ label: "Food" });
    await page.getByRole("button", { name: "Add expense" }).click();
    await expect(page.getByText("Enter a valid amount greater than 0")).toBeVisible();
    await expect(page).toHaveURL(/\/expenses\/new$/);
  });

  test("filters by category and exports CSV", async ({ page }) => {
    await register(page, uniqueEmail("csv"));
    await addExpense(page, { amount: "10", description: "Bus ticket", category: "Transport" });
    await addExpense(page, { amount: "20", description: "=HYPERLINK(evil)", category: "Food" });

    await page.locator("select[name=category]").selectOption({ label: "Transport" });
    await page.getByRole("button", { name: "Filter" }).click();
    await expect(page.getByRole("row", { name: /Bus ticket/ })).toBeVisible();
    await expect(page.getByText("=HYPERLINK(evil)")).toHaveCount(0);

    await page.getByRole("link", { name: "Reset" }).click();
    const response = await page.request.get("/api/export/csv");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/csv");
    const body = await response.text();
    expect(body).toContain('"Bus ticket"');
    expect(body).toContain("\"'=HYPERLINK(evil)\""); // formula neutralised
  });
});

test.describe("categories and budgets", () => {
  test("create category, block duplicates and deleting a category in use", async ({ page }) => {
    await register(page, uniqueEmail("cat"));
    await page.goto("/categories");

    await page.getByPlaceholder("Name").fill("Pets");
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.locator("input[name=name][value=Pets]")).toBeVisible();

    await page.getByPlaceholder("Name").fill("Pets");
    await page.getByRole("button", { name: "Add" }).click();
    await expect(alert(page)).toContainText("already exists");

    await addExpense(page, { amount: "5", description: "Dog food", category: "Pets" });
    await page.goto("/categories");
    page.once("dialog", (d) => d.accept());
    await page.locator("li", { has: page.locator("input[value=Pets]") }).getByRole("button", { name: "Delete" }).click();
    await expect(alert(page)).toContainText("used by 1 expense");
  });

  test("budgets track spending and flag overspend", async ({ page }) => {
    await register(page, uniqueEmail("bud"));
    await addExpense(page, { amount: "120", description: "Concert", category: "Entertainment" });

    await page.goto("/budgets");
    await page.getByPlaceholder("Monthly limit").fill("100");
    await page.getByRole("button", { name: "Save budget" }).click();
    await expect(page.getByText("$120.00 / $100.00")).toBeVisible();
    await expect(page.getByText("over by $20.00")).toBeVisible();

    await page.getByPlaceholder("Monthly limit").fill("500");
    await page.getByRole("button", { name: "Save budget" }).click();
    await expect(page.getByText("$120.00 / $500.00")).toBeVisible();
    await expect(page.getByText("over by")).toHaveCount(0);

    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText("No budgets for this month.")).toBeVisible();
  });
});

test.describe("settings and isolation", () => {
  test("changes password and signs in with the new one", async ({ page }) => {
    const email = uniqueEmail("pw");
    await register(page, email);
    await page.goto("/settings");
    await page.getByLabel("Current password").fill(PASSWORD);
    await page.getByLabel("New password", { exact: true }).fill("a-brand-new-password");
    await page.getByLabel("Confirm new password").fill("a-brand-new-password");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText("Password updated.")).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).first().click();
    await login(page, email, PASSWORD);
    await expect(alert(page)).toBeVisible();
    await login(page, email, "a-brand-new-password");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("one user cannot see or open another user's expenses", async ({ page, browser }) => {
    await register(page, uniqueEmail("alice"));
    await addExpense(page, { amount: "77", description: "Alice secret purchase", category: "Shopping" });
    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page).toHaveURL(/\/expenses\/\d+\/edit$/);
    const editUrl = page.url();

    const ctx = await browser.newContext();
    const bob = await ctx.newPage();
    await register(bob, uniqueEmail("bob"));
    await bob.goto("/expenses");
    await expect(bob.getByText("Alice secret purchase")).toHaveCount(0);
    // Next streams notFound() with a 200 in dev, so assert on the rendered page, not the status.
    await bob.goto(editUrl);
    await expect(bob.getByText("This page could not be found")).toBeVisible();
    await expect(bob.getByText("Alice secret purchase")).toHaveCount(0);
    await expect(bob.getByLabel("Description")).toHaveCount(0);
    await ctx.close();
  });
});
