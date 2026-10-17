"use client";

import { useActionState } from "react";
import { changePasswordAction, updateProfileAction } from "@/lib/actions/settings";
import { CURRENCIES } from "@/lib/constants";
import type { FormState } from "@/lib/validators";
import { SubmitButton } from "./SubmitButton";
import { Alert, Card, Field, inputCls } from "./ui";

export function ProfileForm({ name, currency }: { name: string; currency: string }) {
  const [state, action] = useActionState<FormState, FormData>(updateProfileAction, {});
  return (
    <Card title="Profile">
      <form action={action} className="space-y-4">
        {state.ok && <Alert kind="success">Profile saved.</Alert>}
        {state.error && <Alert>{state.error}</Alert>}
        <Field label="Name" error={state.fieldErrors?.name}>
          <input name="name" defaultValue={name} required className={inputCls} />
        </Field>
        <Field label="Currency" error={state.fieldErrors?.currency}>
          <select name="currency" defaultValue={currency} className={inputCls}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <SubmitButton>Save profile</SubmitButton>
      </form>
    </Card>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(changePasswordAction, {});
  return (
    <Card title="Change password">
      <form key={state.ok ? "done" : "form"} action={action} className="space-y-4">
        {state.ok && <Alert kind="success">Password updated.</Alert>}
        {state.error && <Alert>{state.error}</Alert>}
        <Field label="Current password" error={state.fieldErrors?.current}>
          <input name="current" type="password" autoComplete="current-password" required className={inputCls} />
        </Field>
        <Field label="New password" error={state.fieldErrors?.next}>
          <input name="next" type="password" autoComplete="new-password" minLength={8} required className={inputCls} />
        </Field>
        <Field label="Confirm new password" error={state.fieldErrors?.confirm}>
          <input name="confirm" type="password" autoComplete="new-password" required className={inputCls} />
        </Field>
        <SubmitButton>Update password</SubmitButton>
      </form>
    </Card>
  );
}
