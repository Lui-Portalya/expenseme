export const SESSION_COOKIE = "expenseme_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const DEFAULT_CATEGORIES: ReadonlyArray<{ name: string; color: string }> = [
  { name: "Food", color: "#f97316" },
  { name: "Transport", color: "#0ea5e9" },
  { name: "Housing", color: "#8b5cf6" },
  { name: "Utilities", color: "#eab308" },
  { name: "Health", color: "#ef4444" },
  { name: "Entertainment", color: "#ec4899" },
  { name: "Shopping", color: "#14b8a6" },
  { name: "Other", color: "#64748b" },
];

export const CURRENCIES = ["USD", "EUR", "GBP", "MXN", "CAD", "AUD", "JPY"] as const;
