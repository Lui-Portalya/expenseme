"use server";

import { redirect } from "next/navigation";
import { requireUser } from "../auth";
import { parseAmountToCents } from "../money";
import { getCategory } from "../repos/categories";
import { createExpense, deleteExpense, updateExpense } from "../repos/expenses";
import { expenseSchema, zodState, type FormState } from "../validators";

function parse(userId: number, formData: FormData) {
  const parsed = expenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { state: zodState(parsed.error) };
  const d = parsed.data;
  if (!getCategory(userId, d.categoryId)) return { state: { fieldErrors: { categoryId: ["Choose a category"] } } };
  return {
    input: {
      categoryId: d.categoryId,
      amountCents: parseAmountToCents(d.amount)!,
      description: d.description,
      date: d.date,
      notes: d.notes,
    },
  };
}

export async function createExpenseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const { state, input } = parse(user.id, formData);
  if (!input) return state!;
  createExpense(user.id, input);
  redirect("/expenses");
}

export async function updateExpenseAction(id: number, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const { state, input } = parse(user.id, formData);
  if (!input) return state!;
  if (!updateExpense(user.id, id, input)) return { error: "Expense not found." };
  redirect("/expenses");
}

export async function deleteExpenseAction(id: number): Promise<void> {
  const user = await requireUser();
  deleteExpense(user.id, id);
  redirect("/expenses");
}
