import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";

/**
 * One-way hash of the caller's IP. Raw addresses never reach the database.
 * RATE_LIMIT_SALT should be set in production; the fallback keeps local
 * development working without weakening anything that is actually deployed.
 */
export async function requestIpHash() {
  const salt = process.env.RATE_LIMIT_SALT || "jh-self-drive-secure-rate-limit-salt-fallback-32-chars";
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
