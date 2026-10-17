"use server";

import { redirect } from "next/navigation";
import { requireUser } from "../auth";
import { createCategory, deleteCategory, updateCategory, type CategoryResult } from "../repos/categories";
import { categorySchema } from "../validators";

// These are plain <form action> handlers (no client state), so errors travel back via the URL.
function finish(result: CategoryResult): never {
  redirect(result.ok ? "/categories" : `/categories?error=${encodeURIComponent(result.error)}`);
}

export async function createCategoryAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) finish({ ok: false, error: "Enter a name and a valid color." });
  finish(createCategory(user.id, parsed.data.name, parsed.data.color));
}

export async function updateCategoryAction(id: number, formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) finish({ ok: false, error: "Enter a name and a valid color." });
  finish(updateCategory(user.id, id, parsed.data.name, parsed.data.color));
}

export async function deleteCategoryAction(id: number): Promise<void> {
  const user = await requireUser();
  finish(deleteCategory(user.id, id));
}
