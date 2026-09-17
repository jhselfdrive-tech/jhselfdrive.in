import { describe, expect, it, beforeEach } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { buildApsBody, providerToken, resetProviderToken } from "./apns-payload";

// A throwaway P-256 key, the curve APNs requires for ES256.
const { privateKey } = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
}) as unknown as { privateKey: string };

const config = { keyP8: privateKey, keyId: "ABC123DEFG", teamId: "TEAM123456", bundleId: "in.jhselfdrive.ops", environment: "sandbox" as const };

const decode = (segment: string) => JSON.parse(Buffer.from(segment.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());

describe("providerToken", () => {
  beforeEach(() => resetProviderToken());

  it("builds the header APNs requires", () => {
    const [header] = providerToken(config).split(".");
    expect(decode(header)).toEqual({ alg: "ES256", kid: "ABC123DEFG", typ: "JWT" });
  });

  it("claims the team as issuer with a second-precision iat", () => {
    const now = 1_760_000_000_000;
    const [, claims] = providerToken(config, now).split(".");
    expect(decode(claims)).toEqual({ iss: "TEAM123456", iat: Math.floor(now / 1000) });
  });

  it("is base64url with no padding, so it is header-safe", () => {
    expect(providerToken(config)).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  /**
   * The signature must be raw r||s (ieee-p1363), which for P-256 is exactly 64
   * bytes. Node's default DER encoding is variable-length and ~70 bytes, and
   * APNs rejects it with an unhelpful InvalidProviderToken.
   */
  it("signs with ieee-p1363, giving a fixed 64-byte signature", () => {
    const [, , signature] = providerToken(config).split(".");
    const raw = Buffer.from(signature.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    expect(raw.length).toBe(64);
    expect(raw[0]).not.toBe(0x30); // 0x30 is the DER SEQUENCE tag
  });

  it("reuses the cached token rather than re-signing every push", () => {
    const first = providerToken(config, 1_760_000_000_000);
    expect(providerToken(config, 1_760_000_000_000 + 60_000)).toBe(first);
  });

  it("re-signs once the cache window has passed", () => {
    const first = providerToken(config, 1_760_000_000_000);
    expect(providerToken(config, 1_760_000_000_000 + 60 * 60_000)).not.toBe(first);
  });
});

describe("buildApsBody", () => {
  it("nests the alert and keeps the deep-link id at the top level", () => {
    const body = JSON.parse(buildApsBody({ title: "New booking request", body: "Arun · Swift", bookingId: "b-1" }));
    expect(body.aps.alert).toEqual({ title: "New booking request", body: "Arun · Swift" });
    expect(body.bookingId).toBe("b-1");
  });

  it("omits the badge entirely when none is given, rather than sending zero", () => {
    // A badge of 0 clears the icon; undefined must leave it untouched.
    expect(JSON.parse(buildApsBody({ title: "t", body: "b" })).aps).not.toHaveProperty("badge");
    expect(JSON.parse(buildApsBody({ title: "t", body: "b", badge: 0 })).aps.badge).toBe(0);
  });

  it("marks the payload mutable so the widget can refresh before display", () => {
    expect(JSON.parse(buildApsBody({ title: "t", body: "b" })).aps["mutable-content"]).toBe(1);
  });

  it("carries the summary the widget renders", () => {
    const body = JSON.parse(buildApsBody({ title: "t", body: "b", summary: { pendingRequests: 3 } }));
    expect(body.summary).toEqual({ pendingRequests: 3 });
  });
});
