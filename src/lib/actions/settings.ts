"use server";

import { requireUser, hashPassword, verifyPassword } from "../auth";
import { getUserById, updatePasswordHash, updateProfile } from "../repos/users";
import { passwordSchema, profileSchema, zodState, type FormState } from "../validators";

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodState(parsed.error);
  updateProfile(user.id, parsed.data.name, parsed.data.currency);
  return { ok: true };
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodState(parsed.error);

  const row = getUserById(user.id);
  if (!(await verifyPassword(parsed.data.current, row?.password_hash))) {
    return { fieldErrors: { current: ["Current password is incorrect."] } };
  }
  updatePasswordHash(user.id, await hashPassword(parsed.data.next));
  return { ok: true };
}
