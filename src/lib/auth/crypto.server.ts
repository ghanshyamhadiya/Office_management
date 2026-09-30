import "server-only";
import { createHash, randomBytes } from "node:crypto";

export function hashToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function generateOpaqueToken() {
  return randomBytes(48).toString("hex");
}
