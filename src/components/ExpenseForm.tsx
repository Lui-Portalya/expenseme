"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/lib/validators";
import type { Category } from "@/lib/types";
import { SubmitButton } from "./SubmitButton";
import { Alert, Field, btnGhost, inputCls } from "./ui";

export interface ExpenseDefaults {
  amount: string;
  categoryId: number | "";
  date: string;
  description: string;
  notes: string;
}

export function ExpenseForm({ action, categories, defaults, submitLabel }: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  categories: Category[];
  defaults: ExpenseDefaults;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const err = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Alert>{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount" error={err.amount}>
          <input name="amount" inputMode="decimal" placeholder="0.00" defaultValue={defaults.amount} required className={inputCls} />
        </Field>
        <Field label="Date" error={err.date}>
          <input name="date" type="date" defaultValue={defaults.date} required className={inputCls} />
        </Field>
      </div>
      <Field label="Description" error={err.description}>
        <input name="description" maxLength={200} defaultValue={defaults.description} required className={inputCls} />
      </Field>
      <Field label="Category" error={err.categoryId}>
        <select name="categoryId" defaultValue={defaults.categoryId} required className={inputCls}>
          <option value="" disabled>Choose…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Notes (optional)" error={err.notes}>
        <textarea name="notes" rows={3} maxLength={1000} defaultValue={defaults.notes} className={inputCls} />
      </Field>
      <div className="flex gap-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link href="/expenses" className={btnGhost}>Cancel</Link>
      </div>
    </form>
  );
}
