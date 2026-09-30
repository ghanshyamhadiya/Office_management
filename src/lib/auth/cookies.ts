import { cookies } from "next/headers";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/constants";
import { env } from "@/lib/env";

const secure = env.NODE_ENV === "production";

export async function setAccessCookie(accessToken: string) {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: env.ACCESS_TOKEN_TTL_MINUTES * 60
  });
}

export async function setAuthCookies(accessToken: string, refreshToken: string) {
  await setAccessCookie(accessToken);
  const jar = await cookies();
  jar.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60
  });
}

export async function clearAuthCookies() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}
