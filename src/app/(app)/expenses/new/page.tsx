import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createExpenseAction } from "@/lib/actions/expenses";
import { todayISO } from "@/lib/dates";
import { listCategories } from "@/lib/repos/categories";
import { ExpenseForm } from "@/components/ExpenseForm";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Add expense" };

export default async function NewExpensePage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="Add expense" />
      <Card className="max-w-xl">
        <ExpenseForm
          action={createExpenseAction}
          categories={listCategories(user.id)}
          defaults={{ amount: "", categoryId: "", date: todayISO(), description: "", notes: "" }}
          submitLabel="Add expense"
        />
      </Card>
    </>
  );
}
