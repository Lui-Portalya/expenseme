"use server";

import { redirect } from "next/navigation";
import { endSession, hashPassword, startSession, verifyPassword } from "../auth";
import { createUser, getUserByEmail } from "../repos/users";
import { loginSchema, registerSchema, zodState, type FormState } from "../validators";

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodState(parsed.error);

  const user = getUserByEmail(parsed.data.email);
  const ok = await verifyPassword(parsed.data.password, user?.password_hash);
  if (!user || !ok) return { error: "Invalid email or password." };

  await startSession(user.id);
  redirect("/");
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodState(parsed.error);

  const { name, email, password } = parsed.data;
  if (getUserByEmail(email)) return { fieldErrors: { email: ["An account with this email already exists."] } };

  let userId: number;
  try {
    userId = createUser({ email, name, passwordHash: await hashPassword(password) });
  } catch {
    // Lost a race with another registration of the same email.
    return { fieldErrors: { email: ["An account with this email already exists."] } };
  }
  await startSession(userId);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/login");
}
