"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, LoaderCircle, MessageCircle, RotateCcw, Send } from "lucide-react";
import {
  markMessageSentAction,
  setDepositReturnedAction,
  transitionBookingAction,
  type BookingActionState,
} from "@/app/admin/actions/bookings";
import { composeMessage, type MessageContext, type MessageTemplateId } from "@/lib/messages/templates";
import { whatsAppUrl } from "@/lib/messages/whatsapp";
import { nextStatuses, STATUS_LABEL, transitionLabel, type BookingStatus } from "@/lib/bookings/status";
import { VehicleSelect } from "./VehicleSelect";
import { Modal } from "./Modal";

function toLocalInput(iso: string) {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  });
  return formatter.format(new Date(iso)).replace(" ", "T");
}

/** Shown after a successful transition so the operator can send the message. */
function MessageModal({
  open, onClose, bookingId, templateId, phone, context,
}: {
  open: boolean; onClose: () => void; bookingId: string;
  templateId: MessageTemplateId; phone: string; context: MessageContext;
}) {
  const [state, action, pending] = useActionState(markMessageSentAction, {} as BookingActionState);
  const [copied, setCopied] = useState(false);
  const closed = useRef(false);
  const composed = composeMessage(templateId, context);

  // onClose is an inline arrow in the parent, so guard against the effect
  // re-firing on every subsequent render.
  useEffect(() => {
    if (state.success && !closed.current) { closed.current = true; onClose(); }
  }, [state.success, onClose]);

  return <Modal open={open} onClose={onClose} title="Send the customer an update" subtitle="Opens WhatsApp with this message ready to send.">
    <pre className="admin-message-preview">{composed.body}</pre>
    {!composed.isReady ? <p className="admin-field-warning">Missing: {composed.missing.join(", ")}. The message still sends without those lines.</p> : null}
    <div className="admin-form-actions admin-message-actions">
      <button type="button" className="admin-secondary-button" onClick={() => {
        navigator.clipboard.writeText(composed.body).then(() => setCopied(true)).catch(() => undefined);
      }}><Copy size={14} /> {copied ? "Copied" : "Copy text"}</button>
      {phone
        ? <a className="admin-primary-button" href={whatsAppUrl(phone, composed.body)} target="_blank" rel="noreferrer"><MessageCircle size={14} /> Open WhatsApp</a>
        : <button type="button" className="admin-primary-button" disabled title="No phone number on file"><MessageCircle size={14} /> Open WhatsApp</button>}
      <form action={action}>
        <input type="hidden" name="id" value={bookingId} />
        <input type="hidden" name="templateId" value={templateId} />
        <button className="admin-secondary-button" type="submit" disabled={pending}>
          {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />} Mark as sent
        </button>
      </form>
    </div>
    {state.message && !state.success ? <p className="admin-form-error" role="alert">{state.message}</p> : null}
  </Modal>;
}

/** One legal next status, with the extra fields that edge needs. */
function TransitionForm({
  booking, to, onDone,
}: {
  booking: { id: string; status: BookingStatus; car_slug: string; start_at: string; end_at: string; vehicle_id: string | null; amount_total: number; deposit: number };
  to: BookingStatus;
  onDone: (templateId: string | undefined) => void;
}) {
  const [state, action, pending] = useActionState(transitionBookingAction, {} as BookingActionState);
  const [requestedOpen, setRequestedOpen] = useState(false);
  const notified = useRef(false);
  const needsVehicle = to === "confirmed";
  const needsReason = to === "rejected" || to === "cancelled";
  const isDestructive = needsReason;

  // A landed transition closes the dialog, so `open` is derived rather than
  // reset from an effect.
  const open = requestedOpen && !state.success;

  useEffect(() => {
    if (state.success && !notified.current) {
      notified.current = true;
      onDone(state.templateId);
    }
  }, [state.success, state.templateId, onDone]);

  const label = transitionLabel(booking.status, to);
  const simple = !needsVehicle && !needsReason;

  if (simple) {
    return <form action={action} className="admin-transition-form">
      <input type="hidden" name="id" value={booking.id} />
      <input type="hidden" name="status" value={to} />
      <button className="admin-primary-button" type="submit" disabled={pending}>
        {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} {label}
      </button>
      {state.message && !state.success ? <small className="admin-field-warning">{state.message}</small> : null}
    </form>;
  }

  return <>
    <button type="button" className={isDestructive ? "admin-secondary-button" : "admin-primary-button"} onClick={() => setRequestedOpen(true)}>
      {label}
    </button>
    <Modal open={open} onClose={() => setRequestedOpen(false)} title={label} subtitle={`Moves this booking to ${STATUS_LABEL[to]}.`}>
      <form action={action} className="admin-modal-form">
        <input type="hidden" name="id" value={booking.id} />
        <input type="hidden" name="status" value={to} />
        {needsVehicle ? <>
          <VehicleSelect
            categorySlug={booking.car_slug}
            startAt={toLocalInput(booking.start_at)}
            endAt={toLocalInput(booking.end_at)}
            defaultVehicleId={booking.vehicle_id || ""}
            excludeBookingId={booking.id}
          />
          <div className="admin-form-grid">
            <div className="admin-field"><label htmlFor={`amount-${to}`}>Rental amount (₹)</label><input id={`amount-${to}`} type="number" name="amountTotal" min="0" step="1" defaultValue={Number(booking.amount_total)} /></div>
            <div className="admin-field"><label htmlFor={`deposit-${to}`}>Refundable deposit (₹)</label><input id={`deposit-${to}`} type="number" name="deposit" min="0" step="1" defaultValue={Number(booking.deposit)} /></div>
          </div>
        </> : null}
        <div className="admin-field admin-field-full">
          <label htmlFor={`note-${to}`}>{needsReason ? "Reason (shared with the customer)" : "Note"}</label>
          <textarea id={`note-${to}`} name="note" placeholder={needsReason ? "No cars free for those dates…" : "Anything worth recording…"} required={needsReason} />
        </div>
        {state.message && !state.success ? <p className="admin-form-error" role="alert">{state.message}</p> : null}
        <div className="admin-form-actions">
          <button type="button" className="admin-secondary-button" onClick={() => setRequestedOpen(false)}>Cancel</button>
          <button className={isDestructive ? "admin-danger-button" : "admin-primary-button"} type="submit" disabled={pending}>
            {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} {label}
          </button>
        </div>
      </form>
    </Modal>
  </>;
}

function DepositToggle({ bookingId, depositReturned }: { bookingId: string; depositReturned: boolean }) {
  const [state, action, pending] = useActionState(setDepositReturnedAction, {} as BookingActionState);
  return <form action={action} className="admin-transition-form">
    <input type="hidden" name="id" value={bookingId} />
    <input type="hidden" name="depositReturned" value={depositReturned ? "false" : "true"} />
    <button className="admin-secondary-button" type="submit" disabled={pending}>
      {pending ? <LoaderCircle size={14} className="animate-spin" /> : <RotateCcw size={14} />}
      {depositReturned ? "Mark deposit as held" : "Mark deposit returned"}
    </button>
    {state.message && !state.success ? <small className="admin-field-warning">{state.message}</small> : null}
  </form>;
}

export function BookingTransitions({
  booking, phone, context,
}: {
  booking: { id: string; status: BookingStatus; car_slug: string; start_at: string; end_at: string; vehicle_id: string | null; amount_total: number; deposit: number; deposit_returned: boolean };
  phone: string;
  context: MessageContext;
}) {
  const router = useRouter();
  const [pendingTemplate, setPendingTemplate] = useState<MessageTemplateId | null>(null);
  const options = nextStatuses(booking.status);

  const handleDone = (templateId: string | undefined) => {
    router.refresh();
    if (templateId) setPendingTemplate(templateId as MessageTemplateId);
  };

  return <section className="admin-form-card">
    <div className="admin-card-head">
      <div>
        <h2>Lifecycle</h2>
        <span className="admin-card-subtitle">
          {options.length
            ? "Only the moves that are valid from the current status are offered."
            : `This booking is ${STATUS_LABEL[booking.status].toLowerCase()} — no further changes.`}
        </span>
      </div>
      <span className={`admin-status admin-status-${booking.status}`}>{STATUS_LABEL[booking.status]}</span>
    </div>

    <div className="admin-transition-row">
      {options.map((to) => <TransitionForm key={to} booking={booking} to={to} onDone={handleDone} />)}
      {booking.deposit > 0 && (booking.status === "completed" || booking.status === "cancelled")
        ? <DepositToggle bookingId={booking.id} depositReturned={booking.deposit_returned} />
        : null}
      {!options.length && !(booking.deposit > 0) ? <p className="admin-empty">Nothing left to do here.</p> : null}
    </div>

    {pendingTemplate
      ? <MessageModal
          open
          onClose={() => { setPendingTemplate(null); router.refresh(); }}
          bookingId={booking.id}
          templateId={pendingTemplate}
          phone={phone}
          context={context}
        />
      : null}
  </section>;
}
