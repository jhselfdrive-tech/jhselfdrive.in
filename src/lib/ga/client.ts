import "server-only";
import { createSign } from "node:crypto";
import type { GaBatchResponse, GaReport } from "./map";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const DATA_API = "https://analyticsdata.googleapis.com/v1beta";

type GaConfig = { propertyId: string; clientEmail: string; privateKey: string };

export function getGaConfig(): GaConfig | null {
  const propertyId = (process.env.GA4_PROPERTY_ID || "").trim();
  const clientEmail = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "").trim();
  const privateKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim();
  if (!/^\d+$/.test(propertyId) || !clientEmail.includes("@") || !privateKey.includes("BEGIN")) return null;
  if (clientEmail.includes("your-project")) return null;
  return { propertyId, clientEmail, privateKey };
}

export function isGaConfigured() { return getGaConfig() !== null; }

let cachedToken: { value: string; expiresAt: number } | null = null;

function base64url(value: string) { return Buffer.from(value).toString("base64url"); }

async function getAccessToken(config: GaConfig) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const issuedAt = Math.floor(Date.now() / 1000);
  const claims = { iss: config.clientEmail, scope: SCOPE, aud: TOKEN_URL, iat: issuedAt, exp: issuedAt + 3600 };
  const unsigned = `${base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64url(JSON.stringify(claims))}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(config.privateKey).toString("base64url");
  const response = await fetch(TOKEN_URL, {
    method: "POST", cache: "no-store", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
  });
  if (!response.ok) throw new Error(`Google token request failed (${response.status}). Check the service account email and private key.`);
  const json = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.value;
}

async function callDataApi<T>(method: string, body: unknown): Promise<T> {
  const config = getGaConfig();
  if (!config) throw new Error("GA4 reporting credentials are not configured");
  const response = await fetch(`${DATA_API}/properties/${config.propertyId}:${method}`, {
    method: "POST", cache: "no-store",
    headers: { authorization: `Bearer ${await getAccessToken(config)}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) cachedToken = null;
    const detail = response.status === 403 ? " Grant the service account Viewer access on the GA4 property." : "";
    throw new Error(`GA4 ${method} failed (${response.status}).${detail}`);
  }
  return (await response.json()) as T;
}

export function batchRunReports(requests: unknown[]) { return callDataApi<GaBatchResponse>("batchRunReports", { requests }); }
export function runRealtimeReport(request: unknown) { return callDataApi<GaReport>("runRealtimeReport", request); }
