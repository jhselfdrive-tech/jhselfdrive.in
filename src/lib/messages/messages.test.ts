import { describe, expect, it } from "vitest";
import { formatInr, formatIstDateTime, fuelLabel, rentalDurationLabel } from "./format";
import { composeMessage, messageTemplates, type MessageTemplateId } from "./templates";
import { businessWhatsAppUrl, waDigits, whatsAppUrl } from "./whatsapp";

describe("message formatting", () => {
  it("always formats timestamps in IST", () => {
    const formatted = formatIstDateTime("2026-09-10T20:30:00Z").toLowerCase();
    expect(formatted).toContain("11 sep");
    expect(formatted).toContain("2:00 am");
  });

  it("formats money, duration and fuel labels", () => {
    expect(formatInr(12500)).toContain("12,500");
    expect(rentalDurationLabel("2026-09-10T09:00:00Z", "2026-09-12T09:00:00Z")).toBe("2 days");
    expect(fuelLabel(8)).toBe("Full");
    expect(fuelLabel(3)).toBe("3/8 tank");
  });
});

describe("WhatsApp links", () => {
  it("normalizes phone numbers and encodes messages", () => {
    expect(waDigits("+91 93602-24137")).toBe("919360224137");
    expect(whatsAppUrl("+91 93602 24137", "Hello there")).toBe("https://wa.me/919360224137?text=Hello%20there");
    expect(businessWhatsAppUrl()).toMatch(/^https:\/\/wa\.me\/\d+$/);
  });
});

describe("message templates", () => {
  const readyContext = {
    customerName: "Karthick", carLabel: "Compact SUV", vehicleLabel: "White Brezza · TN65AB1234",
    startAt: "2026-09-11T03:30:00Z", endAt: "2026-09-12T12:30:00Z", amountTotal: 4500,
    amountBalance: 2000, depositAmount: 5000, shareUrl: "https://jhselfdrive.in/r/example",
    amountPaid: 2500, paymentMethod: "UPI", odometerKm: 45210, fuelLabel: "Full",
  };

  it("marks booking confirmation incomplete without an assigned vehicle", () => {
    expect(composeMessage("booking_confirmed", {})).toMatchObject({ isReady: false, missing: ["vehicleLabel"] });
  });

  // A share link is often created after the car is assigned, so it must not
  // block the approved -> confirmed message.
  it("composes booking confirmation without a share link", () => {
    const composed = composeMessage("booking_confirmed", { vehicleLabel: "White Brezza · TN65AB1234" });
    expect(composed.isReady).toBe(true);
    expect(composed.body).not.toContain("Vehicle papers");
  });

  it("composes every registered message under 800 characters", () => {
    (Object.keys(messageTemplates) as MessageTemplateId[]).forEach((id) => {
      const message = composeMessage(id, readyContext);
      expect(message.isReady).toBe(true);
      expect(message.body.length).toBeGreaterThan(10);
      expect(message.body.length).toBeLessThan(800);
    });
  });
});
