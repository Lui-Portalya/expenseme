import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createCategoryAction, deleteCategoryAction, updateCategoryAction } from "@/lib/actions/categories";
import { listCategoriesWithCounts } from "@/lib/repos/categories";
import { ConfirmButton } from "@/components/SubmitButton";
import { Alert, Card, PageHeader, btnDanger, btnGhost, btnPrimary, inputCls } from "@/components/ui";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const { error } = await searchParams;
  const categories = listCategoriesWithCounts(user.id);

  return (
    <>
      <PageHeader title="Categories" />
      {error && <Alert>{error}</Alert>}

      <Card title="New category" className="mb-4">
        <form action={createCategoryAction} className="flex flex-wrap items-center gap-2">
          <input name="name" placeholder="Name" maxLength={40} required className={`${inputCls} max-w-xs`} />
          <input name="color" type="color" defaultValue="#10b981" aria-label="Color" className="h-9 w-12 rounded border border-stone-300 bg-white p-1" />
          <button className={btnPrimary}>Add</button>
        </form>
      </Card>

      <Card className="p-0">
        <ul className="divide-y divide-stone-100">
          {categories.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <form action={updateCategoryAction.bind(null, c.id)} className="flex flex-1 flex-wrap items-center gap-2">
                <input name="color" type="color" defaultValue={c.color} aria-label={`${c.name} color`} className="h-9 w-12 rounded border border-stone-300 bg-white p-1" />
                <input name="name" defaultValue={c.name} maxLength={40} required aria-label="Name" className={`${inputCls} max-w-xs`} />
                <button className={btnGhost}>Save</button>
                <span className="text-xs text-stone-500">{c.expense_count} expense{c.expense_count === 1 ? "" : "s"}</span>
              </form>
              <form action={deleteCategoryAction.bind(null, c.id)}>
                <ConfirmButton message={`Delete "${c.name}"?`} className={btnDanger}>Delete</ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
