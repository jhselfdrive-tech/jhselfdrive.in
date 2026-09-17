import { createSign } from "node:crypto";

/**
 * Pure APNs helpers: provider-token signing and payload shaping.
 *
 * Deliberately not "server-only" — these are plain functions over their
 * arguments with no request or environment access, which keeps them unit
 * testable. The transport that does touch env and sockets lives in apns.ts.
 */

export type ApnsPayload = {
  title: string;
  body: string;
  badge?: number;
  /** Deep-link target in the app. */
  bookingId?: string;
  /** Groups related notifications in the shade. */
  threadId?: string;
  /** Lets a later push replace an earlier one for the same subject. */
  collapseId?: string;
  /** Summary the widget extension writes into the shared App Group store. */
  summary?: Record<string, number>;
};

export type ApnsEnvironment = "production" | "sandbox";

export type ApnsConfig = {
  keyP8: string;
  keyId: string;
  teamId: string;
  bundleId: string;
  environment: ApnsEnvironment;
};

export function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

let cached: { token: string; expiresAt: number } | null = null;

/**
 * The APNs provider JWT. Valid for up to an hour, so it is cached in module
 * scope — a fresh one per push would be wasteful and Apple rate-limits them.
 *
 * The signature MUST be raw r||s ("ieee-p1363"), not Node's default DER.
 * APNs rejects DER with InvalidProviderToken, which is a miserable error to
 * diagnose from the outside.
 */
export function providerToken(config: ApnsConfig, now = Date.now()): string {
  if (cached && cached.expiresAt > now) return cached.token;

  const header = base64Url(JSON.stringify({ alg: "ES256", kid: config.keyId, typ: "JWT" }));
  const claims = base64Url(JSON.stringify({ iss: config.teamId, iat: Math.floor(now / 1000) }));
  const signature = createSign("SHA256")
    .update(`${header}.${claims}`)
    .sign({ key: config.keyP8, dsaEncoding: "ieee-p1363" });

  const token = `${header}.${claims}.${base64Url(signature)}`;
  // Refresh well inside Apple's one-hour ceiling.
  cached = { token, expiresAt: now + 50 * 60 * 1000 };
  return token;
}

/** Only for tests — the cached token would otherwise leak between cases. */
export function resetProviderToken() {
  cached = null;
}

export function buildApsBody(payload: ApnsPayload) {
  return JSON.stringify({
    aps: {
      alert: { title: payload.title, body: payload.body },
      ...(typeof payload.badge === "number" ? { badge: payload.badge } : {}),
      sound: "default",
      ...(payload.threadId ? { "thread-id": payload.threadId } : {}),
      // Lets the notification service extension refresh the widget before the
      // notification is shown.
      "mutable-content": 1,
    },
    ...(payload.bookingId ? { bookingId: payload.bookingId } : {}),
    ...(payload.summary ? { summary: payload.summary } : {}),
  });
}
