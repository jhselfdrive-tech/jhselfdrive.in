import { randomBytes } from "node:crypto";

const DAY_MS = 86_400_000;
export const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function generateShareToken() {
  return randomBytes(32).toString("base64url");
}

export function defaultShareExpiry(endAt: Date | string | number) {
  return new Date(new Date(endAt).getTime() + 3 * DAY_MS);
}

export function clampShareExpiry(requested: Date | string | number, endAt: Date | string | number, now = new Date()) {
  const minimum = now.getTime() + 3_600_000;
  const maximum = new Date(endAt).getTime() + 30 * DAY_MS;
  return new Date(Math.min(Math.max(new Date(requested).getTime(), minimum), Math.max(minimum, maximum)));
}

export function isShareLinkUsable(link: { token: string; expires_at: string; revoked_at?: string | null }, now = new Date()) {
  return SHARE_TOKEN_PATTERN.test(link.token) && !link.revoked_at && new Date(link.expires_at) > now;
}
