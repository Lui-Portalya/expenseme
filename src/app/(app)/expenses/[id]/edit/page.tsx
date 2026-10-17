import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { updateExpenseAction } from "@/lib/actions/expenses";
import { centsToInput } from "@/lib/money";
import { listCategories } from "@/lib/repos/categories";
import { getExpense } from "@/lib/repos/expenses";
import { ExpenseForm } from "@/components/ExpenseForm";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Edit expense" };

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const id = Number((await params).id);
  const expense = Number.isInteger(id) ? getExpense(user.id, id) : undefined;
  if (!expense) notFound();

  return (
    <>
      <PageHeader title="Edit expense" />
      <Card className="max-w-xl">
        <ExpenseForm
          action={updateExpenseAction.bind(null, expense.id)}
          categories={listCategories(user.id)}
          defaults={{
            amount: centsToInput(expense.amount_cents),
            categoryId: expense.category_id,
            date: expense.date,
            description: expense.description,
            notes: expense.notes ?? "",
          }}
          submitLabel="Save changes"
        />
      </Card>
    </>
  );
}
