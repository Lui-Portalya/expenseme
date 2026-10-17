import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { deleteBudgetAction, setBudgetAction } from "@/lib/actions/budgets";
import { currentMonth, isMonth } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { listBudgets } from "@/lib/repos/budgets";
import { listCategories } from "@/lib/repos/categories";
import { MonthNav } from "@/components/MonthNav";
import { ConfirmButton } from "@/components/SubmitButton";
import { Alert, CategoryDot, Card, PageHeader, ProgressBar, btnDanger, btnPrimary, inputCls } from "@/components/ui";

export const metadata: Metadata = { title: "Budgets" };

export default async function BudgetsPage({ searchParams }: { searchParams: Promise<{ month?: string; error?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const month = isMonth(sp.month) ? sp.month : currentMonth();
  const fmt = (c: number) => formatCents(c, user.currency);

  const budgets = listBudgets(user.id, month);
  const categories = listCategories(user.id);

  return (
    <>
      <PageHeader title="Budgets">
        <MonthNav basePath="/budgets" month={month} />
      </PageHeader>
      {sp.error && <Alert>{sp.error}</Alert>}

      <Card title="Set a budget" className="mb-4">
        <form action={setBudgetAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="month" value={month} />
          <select name="categoryId" className={`${inputCls} max-w-xs`} defaultValue="">
            <option value="">Overall (all categories)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input name="limit" inputMode="decimal" placeholder="Monthly limit" required className={`${inputCls} max-w-40`} />
          <button className={btnPrimary}>Save budget</button>
        </form>
        <p className="mt-2 text-xs text-stone-500">Saving again for the same category replaces the existing limit.</p>
      </Card>

      <Card className="p-0">
        {budgets.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-stone-500">No budgets for this month.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {budgets.map((b) => {
              const over = b.spent_cents > b.limit_cents;
              return (
                <li key={b.id} className="px-4 py-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {b.color && <CategoryDot color={b.color} />}
                      {b.category_name ?? "Overall"}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm tabular-nums ${over ? "font-medium text-red-600" : "text-stone-600"}`}>
                        {fmt(b.spent_cents)} / {fmt(b.limit_cents)}
                        {over && ` (over by ${fmt(b.spent_cents - b.limit_cents)})`}
                      </span>
                      <form action={deleteBudgetAction.bind(null, b.id, month)}>
                        <ConfirmButton message="Remove this budget?" className={btnDanger}>Remove</ConfirmButton>
                      </form>
                    </div>
                  </div>
                  <ProgressBar value={b.spent_cents} max={b.limit_cents} />
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
