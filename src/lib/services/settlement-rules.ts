import { getMonthRange } from "@/lib/utils/dates";

export function normalizeSettlementMonth(month: number, year: number) {
  if (!Number.isInteger(month) || !Number.isInteger(year)) {
    throw new Error("Month and year must be integers.");
  }
  if (month < 1 || month > 12) {
    throw new Error("Month must be between 1 and 12.");
  }
  return getMonthRange(year, month);
}
