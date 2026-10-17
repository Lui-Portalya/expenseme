import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isISODate } from "@/lib/dates";
import { centsToInput } from "@/lib/money";
import { listAllExpenses } from "@/lib/repos/expenses";

// Quote every field and neutralize spreadsheet formulas (=, +, -, @ prefixes).
function cell(value: string | number | null): string {
  let s = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const p = req.nextUrl.searchParams;
  const from = p.get("from") ?? undefined;
  const to = p.get("to") ?? undefined;
  const category = Number(p.get("category"));
  const rows = listAllExpenses(user.id, {
    from: isISODate(from) ? from : undefined,
    to: isISODate(to) ? to : undefined,
    categoryId: category > 0 ? category : undefined,
    q: p.get("q")?.trim() || undefined,
  });

  const lines = [
    ["Date", "Description", "Category", `Amount (${user.currency})`, "Notes"].map(cell).join(","),
    ...rows.map((e) =>
      [e.date, e.description, e.category_name, centsToInput(e.amount_cents), e.notes].map(cell).join(","),
    ),
  ];

  return new NextResponse(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="expenses.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
