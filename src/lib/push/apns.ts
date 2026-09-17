import "server-only";
import http2 from "node:http2";
import {
  buildApsBody,
  providerToken,
  type ApnsConfig,
  type ApnsEnvironment,
  type ApnsPayload,
} from "./apns-payload";

export type { ApnsEnvironment, ApnsPayload };

export type ApnsResult =
  | { ok: true; token: string }
  | { ok: false; token: string; status: number; reason: string; expired: boolean };

const HOSTS: Record<ApnsEnvironment, string> = {
  production: "https://api.push.apple.com",
  sandbox: "https://api.sandbox.push.apple.com",
};

export function apnsConfig(): ApnsConfig | null {
  const keyP8 = process.env.APNS_KEY_P8;
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const bundleId = process.env.APNS_BUNDLE_ID;
  if (!keyP8 || !keyId || !teamId || !bundleId) return null;
  return {
    // Vercel env vars cannot hold real newlines, so accept the escaped form.
    keyP8: keyP8.replace(/\\n/g, "\n"),
    keyId,
    teamId,
    bundleId,
    environment: process.env.APNS_ENVIRONMENT === "sandbox" ? "sandbox" : "production",
  };
}

/**
 * Sends one payload to many device tokens over a single HTTP/2 session.
 *
 * `fetch` cannot be used here: APNs only speaks HTTP/2 and undici's fetch does
 * not support it. The session is also closed and awaited before returning,
 * because a serverless function that returns early tears down the socket
 * mid-flight and the push is silently dropped.
 */
export async function sendApns(tokens: string[], payload: ApnsPayload): Promise<ApnsResult[]> {
  const config = apnsConfig();
  if (!config || !tokens.length) return [];

  const jwt = providerToken(config);
  const body = buildApsBody(payload);
  const session = http2.connect(HOSTS[config.environment]);

  try {
    await new Promise<void>((resolve, reject) => {
      session.once("connect", () => resolve());
      session.once("error", reject);
    });

    return await Promise.all(tokens.map((token) => new Promise<ApnsResult>((resolve) => {
      const request = session.request({
        ":method": "POST",
        ":path": `/3/device/${token}`,
        "authorization": `bearer ${jwt}`,
        "apns-topic": config.bundleId,
        "apns-push-type": "alert",
        "apns-priority": "10",
        ...(payload.collapseId ? { "apns-collapse-id": payload.collapseId.slice(0, 64) } : {}),
        "content-type": "application/json",
        "content-length": Buffer.byteLength(body),
      });

      let status = 0;
      let responseBody = "";
      request.on("response", (headers) => { status = Number(headers[":status"]) || 0; });
      request.on("data", (chunk) => { responseBody += chunk; });
      request.on("error", (error) => {
        resolve({ ok: false, token, status: 0, reason: error.message, expired: false });
      });
      request.on("end", () => {
        if (status === 200) { resolve({ ok: true, token }); return; }
        let reason = responseBody;
        try { reason = (JSON.parse(responseBody) as { reason?: string }).reason || responseBody; } catch { /* keep raw */ }
        resolve({
          ok: false, token, status, reason,
          // 410 Gone, or an unregistered/bad token, means this device is dead
          // and its row should go rather than be retried forever.
          expired: status === 410 || reason === "BadDeviceToken" || reason === "Unregistered",
        });
      });

      request.setTimeout(10_000, () => {
        request.close();
        resolve({ ok: false, token, status: 0, reason: "TIMEOUT", expired: false });
      });

      request.end(body);
    })));
  } finally {
    await new Promise<void>((resolve) => session.close(() => resolve()));
  }
}
