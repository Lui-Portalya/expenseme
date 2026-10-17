import Link from "next/link";
import { monthLabel, shiftMonth } from "@/lib/dates";
import { btnGhost } from "./ui";

export function MonthNav({ basePath, month }: { basePath: string; month: string }) {
  return (
    <div className="flex items-center gap-2">
      <Link href={`${basePath}?month=${shiftMonth(month, -1)}`} className={btnGhost} aria-label="Previous month">
        ←
      </Link>
      <span className="min-w-36 text-center text-sm font-medium">{monthLabel(month)}</span>
      <Link href={`${basePath}?month=${shiftMonth(month, 1)}`} className={btnGhost} aria-label="Next month">
        →
      </Link>
    </div>
  );
}
