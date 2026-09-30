import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ACCESS_COOKIE } from "@/lib/auth/constants";
import { verifyAccessToken } from "@/lib/auth/tokens";
import { isDisabledFeatureRoute } from "@/lib/features";

const protectedPrefixes = ["/dashboard", "/expenses", "/leave", "/trips", "/users", "/budget", "/profile", "/audit-logs"];
const authPages = ["/accept-invite"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isDisabledFeatureRoute(pathname)) {
    return pathname.startsWith("/api/")
      ? NextResponse.json({ success: false, message: "Not found" }, { status: 404 })
      : NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const isProtected = protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const token = request.cookies.get(ACCESS_COOKIE)?.value;

  if (!token && isProtected) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!token) {
    return NextResponse.next();
  }

  try {
    const payload = await verifyAccessToken(token);

    if (payload.mustChangePassword && pathname !== "/change-password" && isProtected) {
      return NextResponse.redirect(new URL("/change-password", request.url));
    }

    if (authPages.includes(pathname)) {
      return NextResponse.redirect(new URL(payload.mustChangePassword ? "/change-password" : "/dashboard", request.url));
    }
  } catch {
    if (isProtected) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)", "/api/leave/:path*", "/api/export/leave/:path*", "/api/users/:id/extra-leaves", "/api/trips/:path*", "/api/export/trips/:path*"]
};
