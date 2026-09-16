import { z } from "zod";
import { normalizeIndianPhone } from "./phone";

const indianPhone = z.string().trim().transform((value, ctx) => {
  const phone = normalizeIndianPhone(value);
  if (!phone) {
    ctx.addIssue({ code: "custom", message: "Enter a valid 10-digit Indian mobile number" });
    return z.NEVER;
  }
  return phone;
});

/**
 * A `datetime-local` value, matching the convention the admin actions already
 * use. Date and time arrive as one field so the customer fills two inputs
 * rather than four.
 */
const localDateTime = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a date and time");

/** Turns a `datetime-local` value into an absolute timestamp, read as IST. */
export function istTimestamp(local: string) {
  return `${local}:00+05:30`;
}

function refineWindow(data: { pickupAt: string; returnAt: string }, ctx: z.RefinementCtx) {
  if (new Date(istTimestamp(data.returnAt)) <= new Date(istTimestamp(data.pickupAt))) {
    ctx.addIssue({ code: "custom", path: ["returnAt"], message: "Return must be after pickup" });
  }
}

/** The window the customer picks before any car is chosen. */
export const availabilitySchema = z.object({
  pickupAt: localDateTime,
  returnAt: localDateTime,
}).superRefine(refineWindow);

export type AvailabilityInput = z.infer<typeof availabilitySchema>;

/** A customer booking a specific physical vehicle for a specific window. */
export const directBookingSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  phone: indianPhone,
  city: z.string().trim().max(100).optional().default("Ramanathapuram"),
  vehicleId: z.uuid({ error: "Choose a car" }),
  pickupAt: localDateTime,
  returnAt: localDateTime,
  notes: z.string().trim().max(500).optional().default(""),
  website: z.string().max(0, "Invalid submission").optional().default(""),
  startedAt: z.coerce.number().int().positive(),
  sessionId: z.string().trim().min(8).max(100),
  source: z.string().trim().max(100).optional().default("website"),
  utmSource: z.string().trim().max(200).optional().default(""),
  utmMedium: z.string().trim().max(200).optional().default(""),
  utmCampaign: z.string().trim().max(200).optional().default(""),
}).superRefine(refineWindow);

export type DirectBookingInput = z.infer<typeof directBookingSchema>;
