export type OfficeSchedule = {
  days: number[];
  startMinutes: number;
  endMinutes: number;
};

const weekdayIndex: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function toMinutes(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) throw new Error(`Invalid time "${value}". Use HH:MM.`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 24 || minutes > 59 || (hours === 24 && minutes > 0)) throw new Error(`Invalid time "${value}".`);
  return hours * 60 + minutes;
}

// hours: "10:00-20:00", days: "1-5" or "1,2,3,4,5" (0 = Sunday)
export function parseOfficeSchedule(hours: string, days: string): OfficeSchedule {
  const [start, end] = hours.split("-");
  if (!start || !end) throw new Error(`Invalid office hours "${hours}". Use HH:MM-HH:MM.`);

  const dayList = days.split(",").flatMap((part) => {
    const [from, to] = part.trim().split("-").map(Number);
    if (from === undefined || Number.isNaN(from)) throw new Error(`Invalid office days "${days}".`);
    const last = to === undefined || Number.isNaN(to) ? from : to;
    return Array.from({ length: last - from + 1 }, (_, index) => from + index);
  });

  return { days: dayList.filter((day) => day >= 0 && day <= 6), startMinutes: toMinutes(start), endMinutes: toMinutes(end) };
}

export function localTimeParts(timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { day: weekdayIndex[get("weekday")] ?? -1, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export function isWithinOfficeHours(schedule: OfficeSchedule, timeZone: string, now = new Date()) {
  const { day, minutes } = localTimeParts(timeZone, now);
  return schedule.days.includes(day) && minutes >= schedule.startMinutes && minutes < schedule.endMinutes;
}

export type KeepWarmDecision = { mode: "office" | "off-hours"; warm: boolean };

// Office hours: warm on every ping so the database never scales to zero.
// Off hours: warm only once per `offHoursIntervalMinutes` (stateless: the first ping
// that lands in each interval slot of `pingEveryMinutes` width wakes the database).
export function decideKeepWarm(
  schedule: OfficeSchedule,
  timeZone: string,
  options: { offHoursIntervalMinutes: number; pingEveryMinutes: number },
  now = new Date()
): KeepWarmDecision {
  if (isWithinOfficeHours(schedule, timeZone, now)) return { mode: "office", warm: true };
  if (options.offHoursIntervalMinutes <= 0) return { mode: "off-hours", warm: false };
  const epochMinutes = Math.floor(now.getTime() / 60_000);
  return { mode: "off-hours", warm: epochMinutes % options.offHoursIntervalMinutes < options.pingEveryMinutes };
}
