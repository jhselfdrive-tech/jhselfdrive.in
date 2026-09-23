import { describe, expect, it } from "vitest";
import { normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it.each([["98765 43210", "+919876543210"], ["+91 98765-43210", "+919876543210"], ["919876543210", "+919876543210"]])("normalizes %s", (input, output) => expect(normalizePhone(input)).toBe(output));
  it.each([
    ["+44 7700 900123", "+447700900123"],
    ["0044 7700 900123", "+447700900123"],
    ["+1 (202) 555-0123", "+12025550123"],
    ["+971 50 123 4567", "+971501234567"],
    ["+65 8123 4567", "+6581234567"],
    ["0091 98765 43210", "+919876543210"],
  ])("normalizes international number %s", (input, output) => expect(normalizePhone(input)).toBe(output));
  it.each(["", "12345", "5876543210", "07700900123", "447700900123", "+0123456789", "+123456", "+1234567890123456", "++447700900123", "+44+7700900123", "+91 5876543210", "call 9876543210", "+12025550123 ext 4"])("rejects %s", (input) => expect(normalizePhone(input)).toBeNull());
});
