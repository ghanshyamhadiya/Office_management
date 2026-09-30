import { NextRequest } from "next/server";
import { requireRole, routeError } from "@/lib/utils/route";
import { prisma } from "@/lib/db/prisma";
import { updateUser } from "@/lib/services/user-service";
import { fail, ok } from "@/lib/utils/api";
import { updateUserSchema } from "@/lib/validators/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["SUPER_ADMIN", "EMPLOYEE"]);
    const { id } = await params;
    if (session.user.role !== "SUPER_ADMIN" && session.user.id !== id) return fail("Forbidden", 403);
    const user = await prisma.user.findUnique({ where: { id } });
    return ok("User fetched.", user);
  } catch (error) {
    return routeError(error);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["SUPER_ADMIN"]);
    const { id } = await params;
    const body = updateUserSchema.parse(await request.json());
    const user = await updateUser({ userId: session.user.id, role: session.user.role }, id, body);
    return ok("User updated.", user);
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["SUPER_ADMIN"]);
    const { id } = await params;
    const user = await updateUser({ userId: session.user.id, role: session.user.role }, id, { isActive: false });
    return ok("User deactivated.", user);
  } catch (error) {
    return routeError(error);
  }
}
