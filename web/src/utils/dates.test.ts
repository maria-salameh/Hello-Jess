import { describe, expect, it } from "vitest";
import { addDays, addMonths, endOfMonth, endOfWeek, startOfMonth, startOfWeek, todayLocal } from "./dates";

describe("civil date helpers", () => {
  it("addDays crosses month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29"); // leap year
  });

  it("weeks run from Monday to Sunday", () => {
    expect(startOfWeek("2026-10-07")).toBe("2026-10-05"); // Wednesday -> Monday
    expect(startOfWeek("2026-10-11")).toBe("2026-10-05"); // Sunday stays in the same week
    expect(endOfWeek("2026-10-07")).toBe("2026-10-11");
  });

  it("finds the start and end of a month, including February", () => {
    expect(startOfMonth("2026-10-17")).toBe("2026-10-01");
    expect(endOfMonth("2026-10-17")).toBe("2026-10-31");
    expect(endOfMonth("2026-02-10")).toBe("2026-02-28");
    expect(endOfMonth("2028-02-10")).toBe("2028-02-29");
  });

  it("addMonths returns the first day of the month, before or after", () => {
    expect(addMonths("2026-10-17", 1)).toBe("2026-11-01");
    expect(addMonths("2026-01-17", -1)).toBe("2025-12-01");
  });

  it("todayLocal uses the calendar of the device", () => {
    expect(todayLocal(new Date(2026, 2, 5, 23, 30))).toBe("2026-03-05");
  });
});
