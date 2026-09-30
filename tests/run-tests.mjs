import assert from "node:assert/strict";

function calculateWorkingDays(startDate, endDate) {
  let count = 0;
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function nextUsedDaysForApproval(currentUsedDays, requestDays, status) {
  return status === "APPROVED" ? currentUsedDays + requestDays : currentUsedDays;
}

function summarizeExpenses(expenses, includeArchived = false) {
  return expenses
    .filter((expense) => includeArchived || !expense.archivedAt)
    .reduce(
      (acc, expense) => {
        acc.count += 1;
        acc.total += expense.amount;
        if (expense.isSettled) acc.settled += expense.amount;
        else acc.unsettled += expense.amount;
        if (expense.expenseType === "FOOD" || expense.expenseType === "OTHER") acc.budgetTotal += expense.amount;
        return acc;
      },
      { count: 0, total: 0, settled: 0, unsettled: 0, budgetTotal: 0 }
    );
}

function deriveBudgetWarning(monthlyBudget, spent) {
  return spent > monthlyBudget ? `Current spend ${spent.toFixed(2)} exceeds monthly budget ${monthlyBudget.toFixed(2)}.` : undefined;
}

function normalizeSettlementMonth(month, year) {
  if (!Number.isInteger(month) || !Number.isInteger(year)) throw new Error("Month and year must be integers.");
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { start, end };
}

function canContributeForYear(existingYears, year) {
  return !existingYears.includes(year);
}

function test(name, fn) {
  try {
    fn();
    console.info(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("working day calculation excludes weekends", () => {
  assert.equal(calculateWorkingDays(new Date("2026-03-23"), new Date("2026-03-29")), 5);
});

test("leave approval deducts balance only on approval", () => {
  assert.equal(nextUsedDaysForApproval(2, 3, "PENDING"), 2);
  assert.equal(nextUsedDaysForApproval(2, 3, "APPROVED"), 5);
});

test("other leave does not deduct annual balance", () => {
  assert.equal(nextUsedDaysForApproval(4, 2, "REJECTED"), 4);
});

test("monthly budget warning does not block expense creation", () => {
  assert.match(deriveBudgetWarning(100, 120) ?? "", /exceeds/);
});

test("trip expenses do not count toward budget", () => {
  const summary = summarizeExpenses([
    { expenseType: "FOOD", amount: 100, isSettled: true, archivedAt: null },
    { expenseType: "TRIP", amount: 200, isSettled: false, archivedAt: null }
  ]);
  assert.equal(summary.budgetTotal, 100);
});

test("archived expenses are excluded from summary defaults", () => {
  const summary = summarizeExpenses([
    { expenseType: "FOOD", amount: 100, isSettled: true, archivedAt: null },
    { expenseType: "OTHER", amount: 50, isSettled: false, archivedAt: new Date() }
  ]);
  assert.equal(summary.count, 1);
  assert.equal(summary.total, 100);
});

test("bulk monthly settlement uses integer month and year date range", () => {
  const range = normalizeSettlementMonth(3, 2026);
  assert.equal(range.start.getFullYear(), 2026);
  assert.equal(range.start.getMonth(), 2);
  assert.equal(range.start.getDate(), 1);
  assert.equal(range.end.getFullYear(), 2026);
  assert.equal(range.end.getMonth(), 2);
  assert.equal(range.end.getDate(), 31);
});

test("birthday fund cannot contribute twice for same employee year", () => {
  assert.equal(canContributeForYear([2025], 2025), false);
  assert.equal(canContributeForYear([2025], 2026), true);
});

const { isBirthdayOn, todayInTimeZone } = await import("../src/lib/services/birthday-rules.ts");

test("birthday matches month and day regardless of birth year", () => {
  assert.equal(isBirthdayOn(new Date("1994-09-29T00:00:00Z"), { year: 2026, month: 9, day: 29 }), true);
  assert.equal(isBirthdayOn(new Date("1994-09-28T00:00:00Z"), { year: 2026, month: 9, day: 29 }), false);
});

test("feb 29 birthdays are celebrated on feb 28 in non-leap years", () => {
  const leapling = new Date("2000-02-29T00:00:00Z");
  assert.equal(isBirthdayOn(leapling, { year: 2027, month: 2, day: 28 }), true);
  assert.equal(isBirthdayOn(leapling, { year: 2028, month: 2, day: 28 }), false);
  assert.equal(isBirthdayOn(leapling, { year: 2028, month: 2, day: 29 }), true);
});

test("today is resolved in the office timezone, not UTC", () => {
  const lateUtc = new Date("2026-09-28T20:00:00Z");
  assert.deepEqual(todayInTimeZone("Asia/Kolkata", lateUtc), { year: 2026, month: 9, day: 29 });
  assert.deepEqual(todayInTimeZone("UTC", lateUtc), { year: 2026, month: 9, day: 28 });
});

const { isWithinOfficeHours, parseOfficeSchedule } = await import("../src/lib/services/office-hours.ts");
const officeSchedule = parseOfficeSchedule("10:00-20:00", "1-5");

test("office schedule parses hours and weekday ranges", () => {
  assert.deepEqual(officeSchedule, { days: [1, 2, 3, 4, 5], startMinutes: 600, endMinutes: 1200 });
  assert.deepEqual(parseOfficeSchedule("09:30-18:00", "1,3,5").days, [1, 3, 5]);
  assert.throws(() => parseOfficeSchedule("10-20", "1-5"));
});

test("keep-warm runs 10:00-20:00 IST on weekdays only", () => {
  const ist = (iso) => isWithinOfficeHours(officeSchedule, "Asia/Kolkata", new Date(iso));
  assert.equal(ist("2026-09-30T04:29:00Z"), false); // Wed 09:59 IST
  assert.equal(ist("2026-09-30T04:30:00Z"), true); // Wed 10:00 IST
  assert.equal(ist("2026-09-30T14:29:00Z"), true); // Wed 19:59 IST
  assert.equal(ist("2026-09-30T14:30:00Z"), false); // Wed 20:00 IST
  assert.equal(ist("2026-10-03T06:00:00Z"), false); // Sat 11:30 IST
  assert.equal(ist("2026-10-04T06:00:00Z"), false); // Sun 11:30 IST
});

const { decideKeepWarm } = await import("../src/lib/services/office-hours.ts");

test("keep-warm stays on in office hours and wakes every 30 min off hours", () => {
  const options = { offHoursIntervalMinutes: 30, pingEveryMinutes: 4 };
  const decide = (iso) => decideKeepWarm(officeSchedule, "Asia/Kolkata", options, new Date(iso));
  assert.deepEqual(decide("2026-09-30T06:17:00Z"), { mode: "office", warm: true }); // Wed 11:47 IST
  assert.deepEqual(decide("2026-10-03T06:00:00Z"), { mode: "off-hours", warm: true }); // Sat, slot start
  assert.deepEqual(decide("2026-10-03T06:03:00Z"), { mode: "off-hours", warm: true }); // within 4-min slot
  assert.deepEqual(decide("2026-10-03T06:04:00Z"), { mode: "off-hours", warm: false });
  assert.deepEqual(decide("2026-10-03T06:30:00Z"), { mode: "off-hours", warm: true }); // next slot

  // A 4-minute pinger hits exactly one warm slot per 30 minutes, whatever its phase.
  for (let phase = 0; phase < 4; phase += 1) {
    let warms = 0;
    for (let minute = phase; minute < 24 * 60; minute += 4) {
      if (decide(new Date(Date.UTC(2026, 9, 3, 0, minute)).toISOString()).warm) warms += 1;
    }
    assert.ok(warms >= 47 && warms <= 49, `phase ${phase}: ${warms} warms/day`);
  }
});

test("off-hours interval 0 lets the database sleep", () => {
  const result = decideKeepWarm(officeSchedule, "Asia/Kolkata", { offHoursIntervalMinutes: 0, pingEveryMinutes: 4 }, new Date("2026-10-03T06:00:00Z"));
  assert.deepEqual(result, { mode: "off-hours", warm: false });
});
