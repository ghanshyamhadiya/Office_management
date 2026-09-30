import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { isBirthdayOn, todayInTimeZone } from "@/lib/services/birthday-rules";

export type BirthdayInfo = {
  date: string;
  isMyBirthday: boolean;
  colleagues: Array<{ id: string; name: string }>;
};

export async function getTodaysBirthdays() {
  const today = todayInTimeZone(env.APP_TIMEZONE);
  const users = await prisma.user.findMany({
    where: { isActive: true, birthday: { not: null } },
    select: { id: true, name: true, birthday: true },
  });

  return {
    today,
    date: `${today.year}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`,
    people: users.filter((user) => user.birthday && isBirthdayOn(user.birthday, today)).map(({ id, name }) => ({ id, name })),
  };
}

export async function getBirthdayInfo(userId: string): Promise<BirthdayInfo> {
  const { date, people } = await getTodaysBirthdays();
  return {
    date,
    isMyBirthday: people.some((person) => person.id === userId),
    colleagues: people.filter((person) => person.id !== userId),
  };
}
