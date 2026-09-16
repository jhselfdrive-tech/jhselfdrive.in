import type { MessageTemplateId } from "@/lib/messages/templates";

export const BOOKING_STATUSES = ["requested", "approved", "confirmed", "ongoing", "completed", "cancelled", "rejected"] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Statuses that hold a vehicle against its dates (mirrors the DB exclusion constraint). */
export const BLOCKING_STATUSES: readonly BookingStatus[] = ["approved", "confirmed", "ongoing", "completed"];

/** Statuses that cannot be reached without a vehicle assigned. */
export const REQUIRES_VEHICLE: readonly BookingStatus[] = ["confirmed", "ongoing", "completed"];

export const TERMINAL_STATUSES: readonly BookingStatus[] = ["completed", "cancelled", "rejected"];

export const ALLOWED_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  requested: ["approved", "rejected", "cancelled"],
  approved: ["confirmed", "cancelled", "rejected"],
  confirmed: ["ongoing", "cancelled"],
  ongoing: ["completed"],
  completed: [],
  cancelled: [],
  rejected: [],
};

export const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: "Requested",
  approved: "Approved",
  confirmed: "Confirmed",
  ongoing: "On trip",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Declined",
};

/** Verb shown on the button that performs each transition. */
export const TRANSITION_LABEL: Record<string, string> = {
  "requested->approved": "Approve request",
  "requested->rejected": "Decline request",
  "approved->confirmed": "Assign car & confirm",
  "approved->rejected": "Decline request",
  "confirmed->ongoing": "Start trip",
  "ongoing->completed": "Complete return",
};

const CANCELLED_TEMPLATE: MessageTemplateId = "booking_cancelled";

const TRANSITION_TEMPLATE: Record<string, MessageTemplateId> = {
  "requested->approved": "booking_approved",
  "requested->rejected": "booking_rejected",
  "approved->rejected": "booking_rejected",
  "approved->confirmed": "booking_confirmed",
  "confirmed->ongoing": "trip_started",
  "ongoing->completed": "return_complete",
};

export function isBookingStatus(value: unknown): value is BookingStatus {
  return typeof value === "string" && (BOOKING_STATUSES as readonly string[]).includes(value);
}

export function canTransition(from: BookingStatus, to: BookingStatus) {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function nextStatuses(from: BookingStatus): readonly BookingStatus[] {
  return ALLOWED_TRANSITIONS[from];
}

export function transitionLabel(from: BookingStatus, to: BookingStatus) {
  return TRANSITION_LABEL[`${from}->${to}`] || `Mark ${STATUS_LABEL[to].toLowerCase()}`;
}

/** The WhatsApp template an operator should send after a transition, if any. */
export function templateForTransition(from: BookingStatus, to: BookingStatus): MessageTemplateId | null {
  if (to === "cancelled") return CANCELLED_TEMPLATE;
  return TRANSITION_TEMPLATE[`${from}->${to}`] || null;
}

export function requiresVehicle(status: BookingStatus) {
  return REQUIRES_VEHICLE.includes(status);
}
