import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { deleteExpenseAction } from "@/lib/actions/expenses";
import { isISODate } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { listCategories } from "@/lib/repos/categories";
import { isSortKey, listExpenses, type SortKey } from "@/lib/repos/expenses";
import { ConfirmButton } from "@/components/SubmitButton";
import { CategoryDot, Card, PageHeader, btnDanger, btnGhost, btnPrimary, inputCls } from "@/components/ui";

export const metadata: Metadata = { title: "Expenses" };

const PAGE_SIZE = 20;

type SP = { from?: string; to?: string; category?: string; q?: string; sort?: string; dir?: string; page?: string };

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;

  const filters = {
    from: isISODate(sp.from) ? sp.from : undefined,
    to: isISODate(sp.to) ? sp.to : undefined,
    categoryId: Number(sp.category) > 0 ? Number(sp.category) : undefined,
    q: sp.q?.trim() || undefined,
  };
  const sort: SortKey = isSortKey(sp.sort) ? sp.sort : "date";
  const dir = sp.dir === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(sp.page) || 1);

  const categories = listCategories(user.id);
  const { rows, total } = listExpenses(user.id, filters, { sort, dir, page, pageSize: PAGE_SIZE });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const qs = (over: Partial<SP>) => {
    const merged: SP = { ...sp, ...over };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return p.toString();
  };
  const sortLink = (key: SortKey) =>
    `/expenses?${qs({ sort: key, dir: sort === key && dir === "desc" ? "asc" : "desc", page: undefined })}`;
  const arrow = (key: SortKey) => (sort === key ? (dir === "asc" ? " ↑" : " ↓") : "");
  const exportQs = qs({ sort: undefined, dir: undefined, page: undefined });

  return (
    <>
      <PageHeader title="Expenses">
        <a href={`/api/export/csv?${exportQs}`} className={btnGhost}>Export CSV</a>
        <Link href="/expenses/new" className={btnPrimary}>Add expense</Link>
      </PageHeader>

      <Card className="mb-4">
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" method="get">
          <input name="q" placeholder="Search…" defaultValue={sp.q} className={inputCls} />
          <select name="category" defaultValue={sp.category ?? ""} className={inputCls}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input name="from" type="date" defaultValue={filters.from} aria-label="From date" className={inputCls} />
          <input name="to" type="date" defaultValue={filters.to} aria-label="To date" className={inputCls} />
          <div className="flex gap-2">
            <button className={btnPrimary}>Filter</button>
            <Link href="/expenses" className={btnGhost}>Reset</Link>
          </div>
        </form>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3"><Link href={sortLink("date")}>Date{arrow("date")}</Link></th>
              <th className="px-4 py-3"><Link href={sortLink("description")}>Description{arrow("description")}</Link></th>
              <th className="px-4 py-3"><Link href={sortLink("category")}>Category{arrow("category")}</Link></th>
              <th className="px-4 py-3 text-right"><Link href={sortLink("amount")}>Amount{arrow("amount")}</Link></th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-stone-500">
                  No expenses found.
                </td>
              </tr>
            )}
            {rows.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap px-4 py-3 text-stone-600">{e.date}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{e.description}</p>
                  {e.notes && <p className="max-w-xs truncate text-xs text-stone-500">{e.notes}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2"><CategoryDot color={e.category_color} />{e.category_name}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatCents(e.amount_cents, user.currency)}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/expenses/${e.id}/edit`} className={btnGhost}>Edit</Link>
                    <form action={deleteExpenseAction.bind(null, e.id)}>
                      <ConfirmButton message="Delete this expense?" className={btnDanger}>Delete</ConfirmButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="mt-4 flex items-center justify-between text-sm text-stone-600">
        <span>{total} expense{total === 1 ? "" : "s"}</span>
        <div className="flex items-center gap-2">
          {page > 1 && <Link href={`/expenses?${qs({ page: String(page - 1) })}`} className={btnGhost}>Previous</Link>}
          <span>Page {Math.min(page, pages)} of {pages}</span>
          {page < pages && <Link href={`/expenses?${qs({ page: String(page + 1) })}`} className={btnGhost}>Next</Link>}
        </div>
      </div>
    </>
  );
}
