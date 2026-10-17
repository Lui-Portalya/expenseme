import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { currentMonth, isMonth, monthLabel, shiftMonth } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { listBudgets } from "@/lib/repos/budgets";
import { dailyTrend, monthTotal, monthlyTrend, recentExpenses, spendingByCategory } from "@/lib/repos/stats";
import { CategoryDonut, TrendBars } from "@/components/Charts";
import { MonthNav } from "@/components/MonthNav";
import { CategoryDot, Card, PageHeader, ProgressBar, btnPrimary } from "@/components/ui";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const month = isMonth(sp.month) ? sp.month : currentMonth();
  const fmt = (c: number) => formatCents(c, user.currency);

  const total = monthTotal(user.id, month);
  const prev = monthTotal(user.id, shiftMonth(month, -1));
  const byCategory = spendingByCategory(user.id, month);
  const daily = dailyTrend(user.id, month);
  const monthly = monthlyTrend(user.id, month, 6);
  const budgets = listBudgets(user.id, month);
  const recent = recentExpenses(user.id, 6);
  const overall = budgets.find((b) => b.category_id === null);
  const diff = prev > 0 ? ((total - prev) / prev) * 100 : null;

  return (
    <>
      <PageHeader title="Dashboard">
        <MonthNav basePath="/" month={month} />
        <Link href="/expenses/new" className={btnPrimary}>Add expense</Link>
      </PageHeader>

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Card title={`Spent in ${monthLabel(month)}`}>
          <p className="text-3xl font-semibold tracking-tight">{fmt(total)}</p>
          {diff !== null && (
            <p className={`mt-1 text-sm ${diff > 0 ? "text-red-600" : "text-emerald-700"}`}>
              {diff > 0 ? "▲" : "▼"} {Math.abs(diff).toFixed(0)}% vs last month
            </p>
          )}
        </Card>
        <Card title="Last month">
          <p className="text-3xl font-semibold tracking-tight">{fmt(prev)}</p>
        </Card>
        <Card title="Monthly budget">
          {overall ? (
            <>
              <p className="mb-2 text-sm text-stone-600">
                {fmt(overall.spent_cents)} of {fmt(overall.limit_cents)}
              </p>
              <ProgressBar value={overall.spent_cents} max={overall.limit_cents} />
            </>
          ) : (
            <p className="text-sm text-stone-500">
              No overall budget. <Link href={`/budgets?month=${month}`} className="text-emerald-700 hover:underline">Set one</Link>
            </p>
          )}
        </Card>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card title="By category">
          {byCategory.length === 0 ? (
            <p className="py-10 text-center text-sm text-stone-500">No expenses this month.</p>
          ) : (
            <>
              <CategoryDonut
                currency={user.currency}
                data={byCategory.map((c) => ({ name: c.name, color: c.color, cents: c.total_cents }))}
              />
              <ul className="mt-2 space-y-1 text-sm">
                {byCategory.map((c) => (
                  <li key={c.id} className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><CategoryDot color={c.color} />{c.name}</span>
                    <span className="tabular-nums">{fmt(c.total_cents)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
        <Card title="Daily spending">
          <TrendBars currency={user.currency} data={daily.map((d) => ({ label: String(d.day), cents: d.cents }))} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Last 6 months">
          <TrendBars
            currency={user.currency}
            data={monthly.map((m) => ({ label: monthLabel(m.month, "short"), cents: m.cents }))}
          />
        </Card>
        <Card title="Recent expenses" action={<Link href="/expenses" className="text-sm text-emerald-700 hover:underline">View all</Link>}>
          {recent.length === 0 ? (
            <p className="py-10 text-center text-sm text-stone-500">Nothing yet — add your first expense.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {recent.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{e.description}</p>
                    <p className="flex items-center gap-2 text-xs text-stone-500">
                      <CategoryDot color={e.category_color} />{e.category_name} · {e.date}
                    </p>
                  </div>
                  <span className="ml-3 tabular-nums">{fmt(e.amount_cents)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
