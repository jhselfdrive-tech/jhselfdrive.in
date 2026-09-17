import type { PaymentKind } from "@/lib/messages/events";

export type PaymentMethod = "cash" | "upi" | "bank" | "other";

export type BookingPayment = {
  id: string;
  booking_id: string;
  /** Set when the entry came from a handover checklist, where it is edited. */
  handover_id: string | null;
  kind: PaymentKind;
  amount: number;
  method: PaymentMethod;
  note: string | null;
  received_at: string;
  recorded_by: string;
  created_at: string;
};

export const PAYMENT_KIND_LABEL: Record<PaymentKind, string> = {
  rental: "Rental payment",
  deposit: "Refundable deposit",
  refund: "Deposit refund",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  upi: "UPI",
  bank: "Bank transfer",
  other: "Other",
};
