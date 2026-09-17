import { describe, expect, it } from "vitest";
import { eventKey, eventLabel, templateForEvent } from "./events";
import { messageTemplates } from "./templates";
import { ALLOWED_TRANSITIONS, BOOKING_STATUSES, type BookingStatus } from "@/lib/bookings/status";

describe("event keys", () => {
  it("gives each lifecycle status its own key", () => {
    expect(eventKey({ kind: "status", to: "requested" })).toBe("requested");
    expect(eventKey({ kind: "status", to: "approved" })).toBe("status:approved");
    expect(eventKey({ kind: "status", to: "rejected" })).toBe("status:rejected");
    expect(eventKey({ kind: "status", to: "confirmed" })).toBe("status:confirmed");
    expect(eventKey({ kind: "status", to: "cancelled" })).toBe("status:cancelled");
  });

  // The whole point of the shared key: an operator marks the trip started and
  // saves the delivery checklist a minute apart, and the customer must only
  // ever be messaged once about it.
  it("collapses 'trip started' and the delivery checklist onto one key", () => {
    expect(eventKey({ kind: "status", to: "ongoing" }))
      .toBe(eventKey({ kind: "handover", phase: "delivery" }));
    expect(eventKey({ kind: "handover", phase: "delivery" })).toBe("trip_started");
  });

  it("collapses 'completed' and the return checklist onto one key", () => {
    expect(eventKey({ kind: "status", to: "completed" }))
      .toBe(eventKey({ kind: "handover", phase: "return" }));
    expect(eventKey({ kind: "handover", phase: "return" })).toBe("return_complete");
  });

  it("keeps delivery and return apart", () => {
    expect(eventKey({ kind: "handover", phase: "delivery" }))
      .not.toBe(eventKey({ kind: "handover", phase: "return" }));
  });

  it("gives every payment its own key so part payments each notify", () => {
    const a = eventKey({ kind: "payment", paymentId: "aaa", paymentKind: "rental" });
    const b = eventKey({ kind: "payment", paymentId: "bbb", paymentKind: "rental" });
    expect(a).not.toBe(b);
    // The kind must not change the key: the payment id alone is the identity.
    expect(eventKey({ kind: "payment", paymentId: "aaa", paymentKind: "deposit" })).toBe(a);
  });

  it("stamps reminders with their date so one cannot fire twice a day", () => {
    const today = eventKey({ kind: "reminder", reminder: "pickup", onDate: "2026-10-01" });
    expect(today).toBe("reminder:pickup:2026-10-01");
    expect(eventKey({ kind: "reminder", reminder: "pickup", onDate: "2026-10-02" })).not.toBe(today);
    expect(eventKey({ kind: "reminder", reminder: "return_due", onDate: "2026-10-01" })).not.toBe(today);
  });

  it("never exceeds the column's length limit", () => {
    const longest = eventKey({ kind: "payment", paymentId: "3f1c8d0e-1f2a-4b6c-9d8e-0a1b2c3d4e5f", paymentKind: "rental" });
    expect(longest.length).toBeLessThanOrEqual(120);
  });
});

describe("templates for events", () => {
  it("resolves a real template for every reachable status", () => {
    const reachable = new Set<BookingStatus>(["requested"]);
    for (const status of BOOKING_STATUSES) {
      for (const target of ALLOWED_TRANSITIONS[status]) reachable.add(target);
    }
    for (const status of reachable) {
      const templateId = templateForEvent({ kind: "status", to: status });
      expect(templateId, `no template for ${status}`).not.toBeNull();
      expect(messageTemplates[templateId!]).toBeDefined();
    }
  });

  it("maps payments by kind", () => {
    expect(templateForEvent({ kind: "payment", paymentId: "x", paymentKind: "rental" })).toBe("payment_received");
    expect(templateForEvent({ kind: "payment", paymentId: "x", paymentKind: "deposit" })).toBe("deposit_collected");
    expect(templateForEvent({ kind: "payment", paymentId: "x", paymentKind: "refund" })).toBe("deposit_refunded");
  });

  it("maps handovers and reminders to real templates", () => {
    expect(templateForEvent({ kind: "handover", phase: "delivery" })).toBe("trip_started");
    expect(templateForEvent({ kind: "handover", phase: "return" })).toBe("return_complete");
    expect(templateForEvent({ kind: "reminder", reminder: "pickup", onDate: "2026-10-01" })).toBe("pickup_reminder");
    expect(templateForEvent({ kind: "reminder", reminder: "return_due", onDate: "2026-10-01" })).toBe("return_due");
    expect(templateForEvent({ kind: "reminder", reminder: "overdue", onDate: "2026-10-01" })).toBe("return_overdue");
  });

  it("agrees with the status machine that a shared key means a shared template", () => {
    expect(templateForEvent({ kind: "status", to: "ongoing" }))
      .toBe(templateForEvent({ kind: "handover", phase: "delivery" }));
    expect(templateForEvent({ kind: "status", to: "completed" }))
      .toBe(templateForEvent({ kind: "handover", phase: "return" }));
  });
});

describe("eventLabel", () => {
  it("describes every key shape for the operator", () => {
    expect(eventLabel("requested")).toBe("Request received");
    expect(eventLabel("trip_started")).toBe("Trip started");
    expect(eventLabel("return_complete")).toBe("Return complete");
    expect(eventLabel("status:approved")).toBe("Moved to approved");
    expect(eventLabel("payment:abc")).toBe("Payment recorded");
    expect(eventLabel("reminder:pickup:2026-10-01")).toBe("Pickup reminder");
    expect(eventLabel("reminder:overdue:2026-10-01")).toBe("Overdue return");
  });
});
