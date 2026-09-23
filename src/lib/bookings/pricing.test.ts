import { describe, expect, it } from "vitest";
import { calculateBookingDays, quoteRental } from "./pricing";

const ist = (day: number, time: string) => `2026-10-${String(day).padStart(2, "0")}T${time}:00+05:30`;

describe("calculateBookingDays", () => {
  it("charges one day for a same-day rental", () => {
    expect(calculateBookingDays(ist(1, "09:00"), ist(1, "18:00"))).toBe(1);
  });

  it("charges one day for an exact 24-hour rental", () => {
    expect(calculateBookingDays(ist(1, "09:00"), ist(2, "09:00"))).toBe(1);
  });

  it("charges two days from the 23rd to the 25th at the same time", () => {
    expect(quoteRental(2500, ist(23, "09:00"), ist(25, "09:00"))).toEqual({ days: 2, amountTotal: 5000 });
  });

  it("rounds any part-day beyond 24 hours up to the next day", () => {
    expect(calculateBookingDays(ist(1, "09:00"), ist(2, "09:01"))).toBe(2);
    expect(calculateBookingDays(ist(1, "09:00"), ist(2, "18:00"))).toBe(2);
    expect(calculateBookingDays(ist(1, "09:00"), ist(3, "18:00"))).toBe(3);
  });

  it("floors at one day for a zero or reversed window", () => {
    expect(calculateBookingDays(ist(1, "09:00"), ist(1, "09:00"))).toBe(1);
    expect(calculateBookingDays(ist(3, "09:00"), ist(1, "09:00"))).toBe(1);
  });

  it("accepts Date objects as well as strings", () => {
    expect(calculateBookingDays(new Date(ist(1, "09:00")), new Date(ist(3, "10:00")))).toBe(3);
  });
});

describe("quoteRental", () => {
  it("multiplies the day rate by the charged days", () => {
    expect(quoteRental(2500, ist(1, "09:00"), ist(3, "18:00"))).toEqual({ days: 3, amountTotal: 7500 });
  });

  it("quotes a full day for a few hours", () => {
    expect(quoteRental(1800, ist(1, "09:00"), ist(1, "13:00"))).toEqual({ days: 1, amountTotal: 1800 });
  });
});
