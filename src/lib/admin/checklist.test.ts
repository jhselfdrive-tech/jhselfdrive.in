import { describe, expect, it } from "vitest";
import { checklistGaps, odometerWarning, paymentSummary } from "./checklist";

describe("booking checklist", () => {
  it("treats absent schema data as unknown rather than incomplete", () => expect(checklistGaps(undefined)).toEqual([]));

  it("reports missing delivery and return evidence", () => {
    const gaps = checklistGaps({ has_delivery: true, has_return: false, delivery_odometer_km: 12000, delivery_fuel_eighths: 8, has_licence_front: true, has_licence_back: false, delivery_condition_count: 2, return_condition_count: 0 });
    expect(gaps).toContain("Licence back missing");
    expect(gaps).toContain("Return checklist not recorded");
    expect(gaps).not.toContain("Delivery checklist not recorded");
  });

  it("summarizes payments and warns on a lower odometer", () => {
    expect(paymentSummary({ amount_total: 5000, amount_collected: 3500, deposit_collected: 2000 })).toEqual({ total: 5000, collected: 3500, balance: 1500, deposit: 2000 });
    expect(odometerWarning(15000, 14950)).toContain("50 km below");
    expect(odometerWarning(15000, 15100)).toBeNull();
  });
});
