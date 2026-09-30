import { prisma } from "@/lib/db/prisma";
import { isPushConfigured, sendPushToUsers } from "@/lib/push";
import { getTodaysBirthdays } from "@/lib/services/birthday-service";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

export async function sendBirthdayNotifications() {
  if (!isPushConfigured()) return { birthdays: 0, sent: 0, skipped: "push not configured" as const };

  const { date, people } = await getTodaysBirthdays();
  if (people.length === 0) return { birthdays: 0, sent: 0 };

  let sent = 0;
  for (const person of people) {
    const wish = await sendPushToUsers([person.id], {
      title: `Happy Birthday, ${firstName(person.name)}!`,
      body: "The whole OfficeFlow team wishes you a fantastic year ahead. Open OfficeFlow for a surprise.",
      url: "/dashboard",
      tag: `birthday-self-${date}`,
    });
    sent += wish.sent;
  }

  const birthdayIds = people.map((person) => person.id);
  const colleagues = await prisma.user.findMany({
    where: { isActive: true, id: { notIn: birthdayIds }, pushSubscriptions: { some: {} } },
    select: { id: true },
  });

  const names = people.map((person) => firstName(person.name));
  const joined = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  const broadcast = await sendPushToUsers(
    colleagues.map((user) => user.id),
    {
      title: `It's ${joined}'s birthday today`,
      body: `Take a moment to wish ${names.length === 1 ? names[0] : "them"} a happy birthday!`,
      url: "/dashboard",
      tag: `birthday-team-${date}`,
    }
  );

  return { birthdays: people.length, sent: sent + broadcast.sent };
}
