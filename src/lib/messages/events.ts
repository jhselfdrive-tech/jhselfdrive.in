import type { BookingStatus } from "@/lib/bookings/status";
import type { MessageTemplateId } from "./templates";

export type PaymentKind = "rental" | "deposit" | "refund";
export type HandoverPhase = "delivery" | "return";
export type ReminderKind = "pickup" | "return_due" | "overdue";

/**
 * Something that happened to a booking and that the customer should hear about.
 * Every notification in the system starts life as one of these.
 */
export type BookingEvent =
  | { kind: "status"; to: BookingStatus }
  | { kind: "payment"; paymentId: string; paymentKind: PaymentKind }
  | { kind: "handover"; phase: HandoverPhase }
  | { kind: "reminder"; reminder: ReminderKind; onDate: string };

/**
 * Stable identity for an event, unique per booking.
 *
 * Two pairs of events are deliberately collapsed onto one key, because each
 * pair is a single fact from the customer's point of view and an operator
 * performs both within a minute of each other:
 *
 *   status -> ongoing    and  delivery checklist saved  =>  "trip_started"
 *   status -> completed  and  return checklist saved    =>  "return_complete"
 *
 * The `unique (booking_id, event_key)` constraint then makes the second one a
 * no-op, so the customer never gets two near-identical messages.
 */
export function eventKey(event: BookingEvent): string {
  switch (event.kind) {
    case "status":
      if (event.to === "ongoing") return "trip_started";
      if (event.to === "completed") return "return_complete";
      if (event.to === "requested") return "requested";
      return `status:${event.to}`;
    case "handover":
      return event.phase === "delivery" ? "trip_started" : "return_complete";
    case "payment":
      // Per-payment, so a part payment and the balance each get their own message.
      return `payment:${event.paymentId}`;
    case "reminder":
      // Date-stamped, so a reminder cannot fire twice for the same day.
      return `reminder:${event.reminder}:${event.onDate}`;
  }
}

const STATUS_TEMPLATE: Partial<Record<BookingStatus, MessageTemplateId>> = {
  requested: "booking_requested",
  approved: "booking_approved",
  rejected: "booking_rejected",
  confirmed: "booking_confirmed",
  ongoing: "trip_started",
  completed: "return_complete",
  cancelled: "booking_cancelled",
};

const PAYMENT_TEMPLATE: Record<PaymentKind, MessageTemplateId> = {
  rental: "payment_received",
  deposit: "deposit_collected",
  refund: "deposit_refunded",
};

const REMINDER_TEMPLATE: Record<ReminderKind, MessageTemplateId> = {
  pickup: "pickup_reminder",
  return_due: "return_due",
  overdue: "return_overdue",
};

export function templateForEvent(event: BookingEvent): MessageTemplateId | null {
  switch (event.kind) {
    case "status":
      return STATUS_TEMPLATE[event.to] ?? null;
    case "handover":
      return event.phase === "delivery" ? "trip_started" : "return_complete";
    case "payment":
      return PAYMENT_TEMPLATE[event.paymentKind];
    case "reminder":
      return REMINDER_TEMPLATE[event.reminder];
  }
}

/** Short operator-facing description of what triggered a logged message. */
export function eventLabel(key: string): string {
  if (key === "requested") return "Request received";
  if (key === "trip_started") return "Trip started";
  if (key === "return_complete") return "Return complete";
  if (key.startsWith("status:")) return `Moved to ${key.slice(7)}`;
  if (key.startsWith("payment:")) return "Payment recorded";
  if (key.startsWith("reminder:")) {
    const [, reminder] = key.split(":");
    if (reminder === "pickup") return "Pickup reminder";
    if (reminder === "return_due") return "Return reminder";
    return "Overdue return";
  }
  return key;
}
