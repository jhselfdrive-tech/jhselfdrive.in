import { describe, expect, it } from "vitest";
import { deriveSegments } from "./segments";

const now = new Date("2026-09-05T00:00:00Z");
const base = { completed_booking_count: 0, booking_count: 0, enquiry_count: 1, last_seen_at: "2026-09-01T00:00:00Z" };

describe("deriveSegments", () => {
  it("marks three completed bookings loyal", () => expect(deriveSegments({ ...base, booking_count: 3, completed_booking_count: 3 }, now)).toContain("loyal"));
  it("marks two completed bookings repeat", () => expect(deriveSegments({ ...base, booking_count: 2, completed_booking_count: 2 }, now)).toContain("repeat"));
  it("marks one completed booking customer", () => expect(deriveSegments({ ...base, booking_count: 1, completed_booking_count: 1 }, now)).toContain("customer"));
  it("marks repeat enquiry with no booking hot", () => expect(deriveSegments({ ...base, enquiry_count: 2 }, now)).toEqual(["hot_lead"]));
  it("marks everything else new", () => expect(deriveSegments(base, now)).toEqual(["new"]));
  it("marks older than 90 days dormant", () => expect(deriveSegments({ ...base, booking_count: 1, last_seen_at: "2026-06-06T23:59:59Z" }, now)).toContain("dormant"));
  it("does not mark the exact 90-day boundary dormant", () => expect(deriveSegments({ ...base, booking_count: 1, last_seen_at: "2026-06-07T00:00:00Z" }, now)).not.toContain("dormant"));
});
