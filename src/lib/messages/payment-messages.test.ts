import { describe, expect, it } from "vitest";
import { composeMessage } from "./templates";

describe("payment_received", () => {
  const base = { customerName: "Karthick", amountPaid: 2000, paymentMethod: "UPI", amountTotal: 4400 };

  it("states what was received and what is still owed", () => {
    const { body, isReady } = composeMessage("payment_received", { ...base, amountBalance: 2400 });
    expect(isReady).toBe(true);
    expect(body).toContain("₹2,000");
    expect(body).toContain("UPI");
    expect(body).toContain("Still to pay: ₹2,400");
  });

  it("says the rental is settled when nothing is outstanding", () => {
    const { body } = composeMessage("payment_received", { ...base, amountPaid: 4400, amountBalance: 0 });
    expect(body).toContain("fully paid");
    expect(body).not.toContain("Still to pay");
  });

  it("is incomplete without an amount", () => {
    expect(composeMessage("payment_received", {})).toMatchObject({ isReady: false, missing: ["amountPaid"] });
  });
});

describe("deposit_collected", () => {
  it("promises the deposit back", () => {
    const { body } = composeMessage("deposit_collected", { customerName: "Arun", amountPaid: 3000 });
    expect(body).toContain("₹3,000");
    expect(body).toContain("refundable");
  });
});

describe("return_overdue", () => {
  it("names the time it was due and asks for an ETA", () => {
    const { body, isReady } = composeMessage("return_overdue", { customerName: "Arun", endAt: "2026-10-03T12:30:00Z" });
    expect(isReady).toBe(true);
    expect(body).toContain("expected return time");
  });
});

describe("handover-driven templates carry the recorded readings", () => {
  it("includes odometer and fuel at pickup", () => {
    const { body } = composeMessage("trip_started", {
      customerName: "Arun", endAt: "2026-10-03T12:30:00Z", odometerKm: 45210, fuelLabel: "Full",
    });
    expect(body).toContain("45,210 km");
    expect(body).toContain("Fuel at pickup: Full");
  });

  it("includes the balance and deposit position at return", () => {
    const { body } = composeMessage("return_complete", {
      customerName: "Arun", odometerKm: 45810, fuelLabel: "3/8 tank", amountBalance: 500, depositAmount: 3000,
    });
    expect(body).toContain("45,810 km");
    expect(body).toContain("Balance to settle: ₹500");
    expect(body).toContain("₹3,000");
  });
});
