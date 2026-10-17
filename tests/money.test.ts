import { describe, expect, it } from "vitest";
import { centsToInput, parseAmountToCents } from "@/lib/money";
import { monthBounds, shiftMonth } from "@/lib/dates";

describe("parseAmountToCents", () => {
  it("parses valid amounts", () => {
    expect(parseAmountToCents("12")).toBe(1200);
    expect(parseAmountToCents("12.5")).toBe(1250);
    expect(parseAmountToCents("1,234.56")).toBe(123456);
    expect(parseAmountToCents("0.07")).toBe(7);
  });
  it("rejects invalid amounts", () => {
    for (const bad of ["", "abc", "-5", "1.234", "1e3", "12.", ".5"]) {
      expect(parseAmountToCents(bad)).toBeNull();
    }
  });
  it("round-trips through the input format", () => {
    expect(centsToInput(parseAmountToCents("19.9")!)).toBe("19.90");
  });
});

describe("dates", () => {
  it("shifts months across year boundaries", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });
  it("computes half-open month bounds", () => {
    expect(monthBounds("2026-02")).toEqual({ start: "2026-02-01", end: "2026-03-01" });
  });
});
