export interface SessionUser {
  id: number;
  email: string;
  name: string;
  currency: string;
}

export interface Category {
  id: number;
  user_id: number;
  name: string;
  color: string;
}

export interface Expense {
  id: number;
  user_id: number;
  category_id: number;
  amount_cents: number;
  description: string;
  date: string;
  notes: string | null;
}

export interface ExpenseRow extends Expense {
  category_name: string;
  category_color: string;
}

export interface BudgetRow {
  id: number;
  category_id: number | null;
  category_name: string | null;
  color: string | null;
  limit_cents: number;
  spent_cents: number;
}
