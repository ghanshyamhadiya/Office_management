import { addDays, eachDayOfInterval, endOfMonth, formatISO, getDay, startOfMonth } from "date-fns";

export function calculateWorkingDays(startDate: Date, endDate: Date) {
  return eachDayOfInterval({ start: startDate, end: endDate }).filter((date) => {
    const day = getDay(date);
    return day !== 0 && day !== 6;
  }).length;
}

export function getMonthRange(year: number, month: number) {
  const start = startOfMonth(new Date(year, month - 1, 1));
  const end = endOfMonth(start);
  return { start, end };
}

export function todayIso() {
  return formatISO(new Date(), { representation: "date" });
}

export function inviteExpiryDate() {
  return addDays(new Date(), 2);
}
