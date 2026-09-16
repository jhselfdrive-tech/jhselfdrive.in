import { describe, expect, it } from "vitest";
import {
  ALLOWED_TRANSITIONS,
  BLOCKING_STATUSES,
  BOOKING_STATUSES,
  canTransition,
  isBookingStatus,
  nextStatuses,
  requiresVehicle,
  STATUS_LABEL,
  templateForTransition,
  transitionLabel,
  type BookingStatus,
} from "./status";

describe("booking status machine", () => {
  it("allows exactly the intended forward path", () => {
    expect(canTransition("requested", "approved")).toBe(true);
    expect(canTransition("approved", "confirmed")).toBe(true);
    expect(canTransition("confirmed", "ongoing")).toBe(true);
    expect(canTransition("ongoing", "completed")).toBe(true);
  });

  it("refuses skipping the approval and assignment steps", () => {
    expect(canTransition("requested", "confirmed")).toBe(false);
    expect(canTransition("requested", "ongoing")).toBe(false);
    expect(canTransition("approved", "ongoing")).toBe(false);
    expect(canTransition("confirmed", "completed")).toBe(false);
  });

  it("refuses moving backwards", () => {
    expect(canTransition("confirmed", "approved")).toBe(false);
    expect(canTransition("ongoing", "confirmed")).toBe(false);
    expect(canTransition("completed", "ongoing")).toBe(false);
  });

  it("treats completed, cancelled and rejected as terminal", () => {
    for (const status of ["completed", "cancelled", "rejected"] as BookingStatus[]) {
      expect(nextStatuses(status)).toHaveLength(0);
    }
  });

  it("allows cancelling any live booking but not a finished one", () => {
    expect(canTransition("requested", "cancelled")).toBe(true);
    expect(canTransition("approved", "cancelled")).toBe(true);
    expect(canTransition("confirmed", "cancelled")).toBe(true);
    // A trip already under way is completed, not cancelled.
    expect(canTransition("ongoing", "cancelled")).toBe(false);
    expect(canTransition("completed", "cancelled")).toBe(false);
  });

  it("only allows declining before a car is handed over", () => {
    expect(canTransition("requested", "rejected")).toBe(true);
    expect(canTransition("approved", "rejected")).toBe(true);
    expect(canTransition("confirmed", "rejected")).toBe(false);
  });

  it("names a vehicle as required from confirmation onwards", () => {
    expect(requiresVehicle("requested")).toBe(false);
    expect(requiresVehicle("approved")).toBe(false);
    expect(requiresVehicle("confirmed")).toBe(true);
    expect(requiresVehicle("ongoing")).toBe(true);
    expect(requiresVehicle("completed")).toBe(true);
  });

  it("blocks a vehicle's dates from approval onwards", () => {
    expect(BLOCKING_STATUSES).toEqual(["approved", "confirmed", "ongoing", "completed"]);
    expect(BLOCKING_STATUSES).not.toContain("requested");
    expect(BLOCKING_STATUSES).not.toContain("cancelled");
  });

  it("only lists real statuses as destinations", () => {
    for (const status of BOOKING_STATUSES) {
      for (const target of ALLOWED_TRANSITIONS[status]) {
        expect(BOOKING_STATUSES).toContain(target);
        expect(target).not.toBe(status);
      }
    }
  });

  it("gives every status a label and every live status a transition label", () => {
    for (const status of BOOKING_STATUSES) {
      expect(STATUS_LABEL[status]).toBeTruthy();
      for (const target of ALLOWED_TRANSITIONS[status]) {
        expect(transitionLabel(status, target)).toBeTruthy();
      }
    }
  });

  it("guards the status type", () => {
    expect(isBookingStatus("requested")).toBe(true);
    expect(isBookingStatus("pending")).toBe(false);
    expect(isBookingStatus(undefined)).toBe(false);
  });
});

describe("transition messages", () => {
  it("maps each customer-visible edge to a template", () => {
    expect(templateForTransition("requested", "approved")).toBe("booking_approved");
    expect(templateForTransition("requested", "rejected")).toBe("booking_rejected");
    expect(templateForTransition("approved", "rejected")).toBe("booking_rejected");
    expect(templateForTransition("approved", "confirmed")).toBe("booking_confirmed");
    expect(templateForTransition("confirmed", "ongoing")).toBe("trip_started");
    expect(templateForTransition("ongoing", "completed")).toBe("return_complete");
  });

  it("uses one cancellation message whatever the booking was cancelled from", () => {
    expect(templateForTransition("requested", "cancelled")).toBe("booking_cancelled");
    expect(templateForTransition("approved", "cancelled")).toBe("booking_cancelled");
    expect(templateForTransition("confirmed", "cancelled")).toBe("booking_cancelled");
  });

  it("has a message for every legal transition", () => {
    for (const status of BOOKING_STATUSES) {
      for (const target of ALLOWED_TRANSITIONS[status]) {
        expect(templateForTransition(status, target)).not.toBeNull();
      }
    }
  });
});
