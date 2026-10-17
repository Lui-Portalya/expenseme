import { z, ZodError } from "zod";
import { CURRENCIES } from "./constants";
import { isISODate, isMonth } from "./dates";
import { parseAmountToCents } from "./money";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  ok?: boolean;
};

export function zodState(err: ZodError): FormState {
  return { error: "Please fix the highlighted fields.", fieldErrors: z.flattenError(err).fieldErrors };
}

const amount = z
  .string()
  .refine((s) => {
    const c = parseAmountToCents(s);
    return c !== null && c > 0;
  }, "Enter a valid amount greater than 0");

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color");

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80),
  email: z.string().trim().email("Enter a valid email").max(254),
  password: z.string().min(8, "Use at least 8 characters").max(72, "Use at most 72 characters"),
});

export const expenseSchema = z.object({
  amount,
  categoryId: z.coerce.number().int().positive("Choose a category"),
  date: z.string().refine(isISODate, "Enter a valid date"),
  description: z.string().trim().min(1, "Enter a description").max(200),
  notes: z.string().trim().max(1000).optional(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(40),
  color,
});

export const budgetSchema = z.object({
  month: z.string().refine(isMonth, "Invalid month"),
  categoryId: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null)),
  limit: amount,
});

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80),
  currency: z.enum(CURRENCIES),
});

export const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    next: z.string().min(8, "Use at least 8 characters").max(72, "Use at most 72 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { path: ["confirm"], message: "Passwords do not match" });
