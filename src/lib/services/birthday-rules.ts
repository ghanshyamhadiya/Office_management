export function todayInTimeZone(timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// Birthdays are stored as date-only values at UTC midnight, so compare UTC parts.
// Feb 29 birthdays are celebrated on Feb 28 in non-leap years.
export function isBirthdayOn(birthday: Date, today: { year: number; month: number; day: number }) {
  const month = birthday.getUTCMonth() + 1;
  const day = birthday.getUTCDate();
  if (month === 2 && day === 29 && !isLeapYear(today.year)) {
    return today.month === 2 && today.day === 28;
  }
  return month === today.month && day === today.day;
}
