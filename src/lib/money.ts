/** Parses user input like "12", "12.5", "1,234.56" into integer cents. Returns null if invalid. */
export function parseAmountToCents(input: string): number | null {
  const s = input.trim().replace(/[,\s]/g, "");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  return Number(whole) * 100 + Number((frac + "00").slice(0, 2));
}

export function formatCents(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
