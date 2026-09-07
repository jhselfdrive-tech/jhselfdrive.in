import { site } from "@/content/site";
import { formatInr, formatIstDateTime } from "./format";

export type MessageTemplateId = "enquiry_followup" | "booking_confirmed" | "payment_reminder" | "pickup_reminder" | "return_due" | "return_complete" | "deposit_refunded";

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
};

type ContextKey = keyof MessageContext;
type Template = { label: string; description: string; requires: ContextKey[]; lines: (context: MessageContext) => Array<string | false | null | undefined> };

export const messageTemplates: Record<MessageTemplateId, Template> = {
  enquiry_followup: {
    label: "Enquiry follow-up",
    description: "Restart the conversation and confirm the customer's plan.",
    requires: [],
    lines: (ctx) => [`Hi ${ctx.customerName || "there"},`, `Thank you for enquiring with ${site.name}.`, ctx.carLabel && `You asked about: ${ctx.carLabel}`, ctx.startAt && ctx.endAt && `Travel: ${formatIstDateTime(ctx.startAt)} to ${formatIstDateTime(ctx.endAt)}`, "Reply here and we’ll confirm availability and the final price."],
  },
  booking_confirmed: {
    label: "Booking confirmed",
    description: "Send the assigned car, handover window and document link.",
    requires: ["vehicleLabel", "shareUrl"],
    lines: (ctx) => [`Hi ${ctx.customerName || "there"}, your ${site.name} booking is confirmed.`, `Vehicle: ${ctx.vehicleLabel}`, ctx.startAt && `Pickup: ${formatIstDateTime(ctx.startAt)}`, ctx.endAt && `Return: ${formatIstDateTime(ctx.endAt)}`, ctx.amountTotal !== null && ctx.amountTotal !== undefined && `Rental amount: ${formatInr(ctx.amountTotal)}`, `Vehicle papers: ${ctx.shareUrl}`, `Included distance: ${site.pricing.includedKm}`, `Extra distance: ${site.pricing.extraKm}`, `Fuel: ${site.pricing.fuel}`, `Support: ${site.phoneDisplay}`],
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
  return_complete: {
    label: "Return complete",
    description: "Close the rental and acknowledge the return.",
    requires: [],
    lines: (ctx) => [`Hi ${ctx.customerName || "there"}, your vehicle return is complete.`, `Thank you for choosing ${site.name}. We hope to see you on the road again.`],
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
