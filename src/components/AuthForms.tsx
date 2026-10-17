"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, registerAction } from "@/lib/actions/auth";
import type { FormState } from "@/lib/validators";
import { SubmitButton } from "./SubmitButton";
import { Alert, Field, inputCls } from "./ui";

export function LoginForm() {
  const [state, action] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert>{state.error}</Alert>}
      <Field label="Email" error={state.fieldErrors?.email}>
        <input name="email" type="email" autoComplete="email" required className={inputCls} />
      </Field>
      <Field label="Password" error={state.fieldErrors?.password}>
        <input name="password" type="password" autoComplete="current-password" required className={inputCls} />
      </Field>
      <SubmitButton pendingText="Signing in…" className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60">
        Sign in
      </SubmitButton>
      <p className="text-center text-sm text-stone-600">
        New here?{" "}
        <Link href="/register" className="font-medium text-emerald-700 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState<FormState, FormData>(registerAction, {});
  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert>{state.error}</Alert>}
      <Field label="Name" error={state.fieldErrors?.name}>
        <input name="name" autoComplete="name" required className={inputCls} />
      </Field>
      <Field label="Email" error={state.fieldErrors?.email}>
        <input name="email" type="email" autoComplete="email" required className={inputCls} />
      </Field>
      <Field label="Password" error={state.fieldErrors?.password}>
        <input name="password" type="password" autoComplete="new-password" minLength={8} required className={inputCls} />
      </Field>
      <SubmitButton pendingText="Creating account…" className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60">
        Create account
      </SubmitButton>
      <p className="text-center text-sm text-stone-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-emerald-700 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
