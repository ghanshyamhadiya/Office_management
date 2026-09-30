import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { pushSubscriptionSchema, pushUnsubscribeSchema } from "@/lib/validators/push";
import { ok } from "@/lib/utils/api";
import { routeError } from "@/lib/utils/route";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = pushSubscriptionSchema.parse(await request.json());
    const data = {
      userId: session.user.id,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent: request.headers.get("user-agent")?.slice(0, 255) ?? null,
    };
    await prisma.pushSubscription.upsert({
      where: { endpoint: body.endpoint },
      update: data,
      create: { endpoint: body.endpoint, ...data },
    });
    return ok("Notifications enabled.");
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = pushUnsubscribeSchema.parse(await request.json());
    await prisma.pushSubscription.deleteMany({ where: { endpoint: body.endpoint, userId: session.user.id } });
    return ok("Notifications disabled.");
  } catch (error) {
    return routeError(error);
  }
}
