import { site } from "@/content/site";
import { formatInr, formatIstDateTime } from "./format";

export type MessageTemplateId =
  | "booking_requested"
  | "booking_approved"
  | "booking_rejected"
  | "booking_confirmed"
  | "trip_started"
  | "return_complete"
  | "booking_cancelled"
  | "payment_reminder"
  | "pickup_reminder"
  | "return_due"
  | "deposit_refunded";

export type MessageContext = {
  customerName?: string | null;
  carLabel?: string | null;
  vehicleLabel?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  amountTotal?: number | null;
  amountBalance?: number | null;
  depositAmount?: number | null;
  shareUrl?: string | null;
  note?: string | null;
};

type ContextKey = keyof MessageContext;
type Template = { label: string; description: string; requires: ContextKey[]; lines: (context: MessageContext) => Array<string | false | null | undefined> };

const carLine = (ctx: MessageContext) => ctx.vehicleLabel ? `Vehicle: ${ctx.vehicleLabel}` : ctx.carLabel && `Car: ${ctx.carLabel}`;

export const messageTemplates: Record<MessageTemplateId, Template> = {
  booking_requested: {
    label: "Request received",
    description: "Acknowledge a new website booking request while the team checks it.",
    requires: ["startAt", "endAt"],
    lines: (ctx) => [
      `Hi ${ctx.customerName || "there"}, we have received your ${site.name} booking request. 🚗`,
      carLine(ctx),
      ctx.startAt && `Pickup: ${formatIstDateTime(ctx.startAt)}`,
      ctx.endAt && `Return: ${formatIstDateTime(ctx.endAt)}`,
      ctx.amountTotal !== null && ctx.amountTotal !== undefined && `Estimated rental: ${formatInr(ctx.amountTotal)}`,
      "Our team will confirm availability shortly and reply here.",
      `Support: ${site.phoneDisplay}`,
    ],
  },
  booking_approved: {
    label: "Booking approved",
    description: "Tell the customer the request is accepted, ahead of vehicle assignment.",
    requires: ["startAt", "endAt"],
    lines: (ctx) => [
      `Hi ${ctx.customerName || "there"}, your ${site.name} booking has been APPROVED! 🚗`,
      carLine(ctx),
      ctx.startAt && `Pickup: ${formatIstDateTime(ctx.startAt)}`,
      ctx.endAt && `Return: ${formatIstDateTime(ctx.endAt)}`,
      ctx.amountTotal !== null && ctx.amountTotal !== undefined && `Rental amount: ${formatInr(ctx.amountTotal)}`,
      ctx.depositAmount !== null && ctx.depositAmount !== undefined && `Refundable deposit: ${formatInr(ctx.depositAmount)}`,
      `Payment: Pay at vehicle pickup (cash or UPI accepted).`,
      `Documents: Please bring your original valid driving licence and Aadhaar card.`,
      `Included distance: ${site.pricing.includedKm}`,
      `Fuel policy: ${site.pricing.fuel}`,
      `Base: ${site.address}`,
      `Support: ${site.phoneDisplay}`,
    ],
  },
  booking_rejected: {
    label: "Request declined",
    description: "Decline a request politely and keep the door open.",
    requires: [],
    lines: (ctx) => [
      `Hi ${ctx.customerName || "there"}, thank you for your interest in ${site.name}.`,
      ctx.startAt && ctx.endAt && `Unfortunately we cannot serve ${formatIstDateTime(ctx.startAt)} to ${formatIstDateTime(ctx.endAt)}.`,
      ctx.note && `Reason: ${ctx.note}`,
      "Please reply here with alternate dates and we will do our best to help.",
      `Support: ${site.phoneDisplay}`,
    ],
  },
  booking_confirmed: {
    label: "Vehicle assigned & confirmed",
    description: "Send the assigned car, handover window and document link.",
    requires: ["vehicleLabel"],
    lines: (ctx) => [
      `Hi ${ctx.customerName || "there"}, your ${site.name} booking is confirmed.`,
      `Vehicle: ${ctx.vehicleLabel}`,
      ctx.startAt && `Pickup: ${formatIstDateTime(ctx.startAt)}`,
      ctx.endAt && `Return: ${formatIstDateTime(ctx.endAt)}`,
      ctx.amountTotal !== null && ctx.amountTotal !== undefined && `Rental amount: ${formatInr(ctx.amountTotal)}`,
      ctx.shareUrl && `Vehicle papers: ${ctx.shareUrl}`,
      `Included distance: ${site.pricing.includedKm}`,
      `Extra distance: ${site.pricing.extraKm}`,
      `Fuel: ${site.pricing.fuel}`,
      `Support: ${site.phoneDisplay}`,
    ],
  },
  trip_started: {
    label: "Trip started",
    description: "Confirm handover is done and the trip is under way.",
    requires: ["endAt"],
    lines: (ctx) => [
      `Hi ${ctx.customerName || "there"}, your ${site.name} handover is complete. Have a great trip! 🛣️`,
      ctx.vehicleLabel && `Vehicle: ${ctx.vehicleLabel}`,
      ctx.endAt && `Return due: ${formatIstDateTime(ctx.endAt)}`,
      `Fuel policy: ${site.pricing.fuel}`,
      `Any issue on the road? Call ${site.phoneDisplay}.`,
    ],
  },
  return_complete: {
    label: "Return complete",
    description: "Close the rental and acknowledge the return.",
    requires: [],
    lines: (ctx) => [
      `Hi ${ctx.customerName || "there"}, your vehicle return is complete.`,
      `Thank you for choosing ${site.name}. We hope to see you on the road again.`,
    ],
  },
  booking_cancelled: {
    label: "Booking cancelled",
    description: "Confirm a cancellation and any deposit position.",
    requires: [],
    lines: (ctx) => [
      `Hi ${ctx.customerName || "there"}, your ${site.name} booking has been cancelled.`,
      ctx.startAt && `Cancelled trip: ${formatIstDateTime(ctx.startAt)}`,
      ctx.note && `Note: ${ctx.note}`,
      "Reply here whenever you would like to rebook.",
      `Support: ${site.phoneDisplay}`,
    ],
  },
  payment_reminder: {
    label: "Payment reminder",
    description: "Share the outstanding amount before pickup.",
    requires: ["amountBalance"],
    lines: (ctx) => [`Hi ${ctx.customerName || "there"}, a quick payment reminder for your ${site.name} booking.`, `Balance due: ${formatInr(ctx.amountBalance || 0)}`, ctx.startAt && `Pickup: ${formatIstDateTime(ctx.startAt)}`, "Please share confirmation here after payment. Thank you."],
  },
  pickup_reminder: {
    label: "Pickup reminder",
    description: "Remind the customer about the handover and licence.",
    requires: ["startAt"],
    lines: (ctx) => [`Hi ${ctx.customerName || "there"}, your ${site.name} pickup is scheduled for ${formatIstDateTime(ctx.startAt!)}.`, ctx.vehicleLabel && `Vehicle: ${ctx.vehicleLabel}`, "Please bring your original valid driving licence.", ctx.shareUrl && `Vehicle papers: ${ctx.shareUrl}`, `Need help? Call ${site.phoneDisplay}.`],
  },
  return_due: {
    label: "Return due",
    description: "Send the return time and fuel reminder.",
    requires: ["endAt"],
    lines: (ctx) => [`Hi ${ctx.customerName || "there"}, your ${site.name} vehicle is due back by ${formatIstDateTime(ctx.endAt!)}.`, `Fuel policy: ${site.pricing.fuel}.`, "Please message us if your arrival time changes."],
  },
  deposit_refunded: {
    label: "Deposit refunded",
    description: "Confirm that the refundable deposit was returned.",
    requires: ["depositAmount"],
    lines: (ctx) => [`Hi ${ctx.customerName || "there"}, your refundable deposit of ${formatInr(ctx.depositAmount || 0)} has been returned.`, `Thank you for choosing ${site.name}.`],
  },
};

export function composeMessage(id: MessageTemplateId, context: MessageContext) {
  const template = messageTemplates[id];
  const missing = template.requires.filter((key) => context[key] === null || context[key] === undefined || context[key] === "");
  return {
    body: template.lines(context).filter(Boolean).join("\n"),
    isReady: missing.length === 0,
    missing,
  };
}

export function createCustomerBookingMessage(params: {
  fullName: string;
  carName: string;
  startAtLabel: string;
  endAtLabel: string;
  amountTotal: number;
  deposit: number;
  notes?: string;
}) {
  return [
    `Hi ${site.name}, I have placed a direct booking request online!`,
    `Name: ${params.fullName}`,
    `Car: ${params.carName}`,
    `Pickup: ${params.startAtLabel}`,
    `Return: ${params.endAtLabel}`,
    `Estimated Total: ${formatInr(params.amountTotal)}`,
    `Refundable Deposit: ${formatInr(params.deposit)}`,
    params.notes ? `Trip note: ${params.notes}` : "",
    `Please confirm vehicle availability and handover details.`,
  ].filter(Boolean).join("\n");
}
