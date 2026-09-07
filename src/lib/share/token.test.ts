import { describe, expect, it } from "vitest";
import { SHARE_TOKEN_PATTERN, clampShareExpiry, defaultShareExpiry, generateShareToken, isShareLinkUsable } from "./token";

describe("share tokens", () => {
  it("creates unique 43-character base64url tokens", () => {
    const tokens = new Set(Array.from({ length: 100 }, generateShareToken));
    expect(tokens.size).toBe(100);
    tokens.forEach((token) => expect(token).toMatch(SHARE_TOKEN_PATTERN));
  });

  it("defaults to three days after return and clamps extreme requests", () => {
    const end = "2026-09-10T10:00:00Z";
    expect(defaultShareExpiry(end).toISOString()).toBe("2026-09-13T10:00:00.000Z");
    expect(clampShareExpiry("2027-09-10T10:00:00Z", end, new Date("2026-09-01T00:00:00Z")).toISOString()).toBe("2026-10-10T10:00:00.000Z");
    expect(clampShareExpiry("2026-08-01T00:00:00Z", end, new Date("2026-09-01T00:00:00Z")).toISOString()).toBe("2026-09-01T01:00:00.000Z");
  });

  it("rejects malformed, revoked and expired links", () => {
    const token = generateShareToken();
    expect(isShareLinkUsable({ token, expires_at: "2026-09-10T00:00:00Z" }, new Date("2026-09-01T00:00:00Z"))).toBe(true);
    expect(isShareLinkUsable({ token, expires_at: "2026-09-10T00:00:00Z", revoked_at: "2026-09-01T00:00:00Z" }, new Date("2026-09-01T00:00:00Z"))).toBe(false);
    expect(isShareLinkUsable({ token: "junk", expires_at: "2026-09-10T00:00:00Z" }, new Date("2026-09-01T00:00:00Z"))).toBe(false);
  });
});
