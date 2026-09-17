"use client";

import { useActionState } from "react";
import { BellRing, Check, LoaderCircle, MessageCircle, X } from "lucide-react";
import { resolveReminderAction, type MessageActionState } from "@/app/admin/actions/messages";
import { formatIstDateTime } from "@/lib/messages/format";
import { whatsAppUrl } from "@/lib/messages/whatsapp";
import type { DueReminder } from "@/lib/admin/messages";

const TITLE: Record<DueReminder["reminder"], string> = {
  pickup: "Pickup reminder due",
  return_due: "Return reminder due",
  overdue: "Return is overdue — chase the customer",
};

/**
 * A reminder that has no row yet. Sending or dismissing it both creates and
 * resolves it, so the same reminder never appears twice for the same day.
 */
export function ReminderRow({ reminder }: { reminder: DueReminder }) {
  const [state, action, pending] = useActionState(resolveReminderAction, {} as MessageActionState);
  const when = reminder.reminder === "pickup" ? reminder.startAt : reminder.endAt;

  return <div className="admin-alert-row admin-alert-reminder">
    <BellRing size={16} />
    <span>
      <strong>{TITLE[reminder.reminder]}</strong>
      <small>
        {reminder.customerName || reminder.phone} · {formatIstDateTime(when)}
        {reminder.vehicleLabel ? ` · ${reminder.vehicleLabel}` : ""}
      </small>
      {state.message && !state.success ? <small className="admin-field-warning">{state.message}</small> : null}
    </span>
    <form action={action} className="admin-alert-actions">
      <input type="hidden" name="bookingId" value={reminder.bookingId} />
      <input type="hidden" name="reminder" value={reminder.reminder} />
      <input type="hidden" name="onDate" value={reminder.onDate} />
      <a className="admin-primary-button admin-compact-button" href={whatsAppUrl(reminder.phone, reminder.body)} target="_blank" rel="noreferrer">
        <MessageCircle size={13} /> WhatsApp
      </a>
      <button className="admin-secondary-button admin-compact-button" name="outcome" value="sent" type="submit" disabled={pending}>
        {pending ? <LoaderCircle size={13} className="animate-spin" /> : <Check size={13} />} Sent
      </button>
      <button className="admin-icon-button" name="outcome" value="skipped" type="submit" disabled={pending} title="Dismiss" aria-label="Dismiss reminder">
        <X size={13} />
      </button>
    </form>
  </div>;
}
