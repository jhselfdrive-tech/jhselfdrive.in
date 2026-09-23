import { describe, expect, it } from "vitest";
import { availabilitySchema, directBookingSchema, istTimestamp } from "./validation";
import { createCustomerBookingMessage } from "./messages/templates";

describe("directBookingSchema validation", () => {
  const validPayload = {
    fullName: "Karthick Raja",
    phone: "9876543210",
    city: "Ramanathapuram",
    vehicleId: "3f1c8d0e-1f2a-4b6c-9d8e-0a1b2c3d4e5f",
    pickupAt: "2026-10-01T09:00",
    returnAt: "2026-10-03T18:00",
    notes: "Visiting Rameswaram",
    startedAt: "1726000000000",
    sessionId: "session-abc-12345678",
  };

  it("validates a valid direct booking submission", () => {
    const result = directBookingSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("+919876543210");
      expect(result.data.vehicleId).toBe("3f1c8d0e-1f2a-4b6c-9d8e-0a1b2c3d4e5f");
    }
  });

  it("rejects when return date/time is before pickup date/time", () => {
    const invalid = {
      ...validPayload,
      pickupAt: "2026-10-05T09:00",
      returnAt: "2026-10-04T09:00",
    };
    const result = directBookingSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("accepts international mobiles with a country code", () => {
    expect(directBookingSchema.parse({ ...validPayload, phone: "+44 7700 900123" }).phone).toBe("+447700900123");
    expect(directBookingSchema.parse({ ...validPayload, phone: "\u202a+971 50 180 1938\u202c" }).phone).toBe("+971501801938");
  });

  it("rejects invalid mobile numbers", () => {
    const invalidPhone = {
      ...validPayload,
      phone: "12345",
    };
    const result = directBookingSchema.safeParse(invalidPhone);
    expect(result.success).toBe(false);
  });

  it("rejects a car reference that is not a vehicle id", () => {
    const result = directBookingSchema.safeParse({ ...validPayload, vehicleId: "compact-suv" });
    expect(result.success).toBe(false);
  });

  it("rejects a same-day window that ends before it starts", () => {
    const result = directBookingSchema.safeParse({
      ...validPayload, pickupAt: "2026-10-01T18:00", returnAt: "2026-10-01T09:00",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a same-day window of a few hours", () => {
    const result = directBookingSchema.safeParse({
      ...validPayload, pickupAt: "2026-10-01T09:00", returnAt: "2026-10-01T18:00",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a date without a time", () => {
    const result = directBookingSchema.safeParse({ ...validPayload, pickupAt: "2026-10-01" });
    expect(result.success).toBe(false);
  });
});

describe("availabilitySchema", () => {
  it("accepts a datetime-local window", () => {
    const result = availabilitySchema.safeParse({ pickupAt: "2026-10-01T09:00", returnAt: "2026-10-03T18:00" });
    expect(result.success).toBe(true);
  });

  it("rejects a reversed window", () => {
    const result = availabilitySchema.safeParse({ pickupAt: "2026-10-05T09:00", returnAt: "2026-10-04T09:00" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed value", () => {
    expect(availabilitySchema.safeParse({ pickupAt: "next friday", returnAt: "2026-10-04T09:00" }).success).toBe(false);
  });
});

describe("istTimestamp", () => {
  it("reads a local value as IST", () => {
    expect(istTimestamp("2026-10-01T09:00")).toBe("2026-10-01T09:00:00+05:30");
  });
});

describe("createCustomerBookingMessage", () => {
  it("formats a clear, structured WhatsApp message for the business", () => {
    const message = createCustomerBookingMessage({
      fullName: "Arun Kumar",
      carName: "Compact SUV",
      startAtLabel: "2026-10-01 at 09:00",
      endAtLabel: "2026-10-03 at 18:00",
      amountTotal: 5000,
      deposit: 5000,
      notes: "Temple trip",
    });

    expect(message).toContain("JH Self Drive");
    expect(message).toContain("Arun Kumar");
    expect(message).toContain("Compact SUV");
    expect(message).toContain("5,000");
    expect(message).toContain("Temple trip");
  });
});
