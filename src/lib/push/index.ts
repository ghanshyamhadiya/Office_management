import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
};

let configured = false;

export function isPushConfigured() {
  return Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

function ensureConfigured() {
  if (!isPushConfigured()) {
    throw new Error("Push notifications are not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.");
  }
  if (!configured) {
    webpush.setVapidDetails(env.VAPID_SUBJECT, env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
    configured = true;
  }
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (!isPushConfigured() || userIds.length === 0) return { sent: 0, removed: 0 };
  ensureConfigured();

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } });
  const body = JSON.stringify(payload);
  const expired: string[] = [];
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          body,
          { TTL: 60 * 60 * 12 }
        );
        sent += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) expired.push(subscription.id);
        else console.error("Push delivery failed", statusCode ?? error);
      }
    })
  );

  if (expired.length) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: expired } } });
  }

  return { sent, removed: expired.length };
}
