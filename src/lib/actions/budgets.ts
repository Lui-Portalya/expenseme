"use server";

import { redirect } from "next/navigation";
import { requireUser } from "../auth";
import { currentMonth, isMonth } from "../dates";
import { parseAmountToCents } from "../money";
import { getCategory } from "../repos/categories";
import { deleteBudget, setBudget } from "../repos/budgets";
import { budgetSchema } from "../validators";

const back = (month: string, error?: string): never =>
  redirect(`/budgets?month=${month}${error ? `&error=${encodeURIComponent(error)}` : ""}`);

export async function setBudgetAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const rawMonth = String(formData.get("month") ?? "");
  const month = isMonth(rawMonth) ? rawMonth : currentMonth();

  const parsed = budgetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return back(month, "Enter a valid limit greater than 0.");

  const { categoryId, limit } = parsed.data;
  if (categoryId !== null && !getCategory(user.id, categoryId)) return back(month, "Unknown category.");

  setBudget(user.id, month, categoryId, parseAmountToCents(limit)!);
  back(month);
}

export async function deleteBudgetAction(id: number, month: string): Promise<void> {
  const user = await requireUser();
  deleteBudget(user.id, id);
  back(isMonth(month) ? month : currentMonth());
}
