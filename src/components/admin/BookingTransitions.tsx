"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, RotateCcw } from "lucide-react";
import {
  setDepositReturnedAction,
  transitionBookingAction,
  type BookingActionState,
} from "@/app/admin/actions/bookings";
import { nextStatuses, STATUS_LABEL, transitionLabel, type BookingStatus } from "@/lib/bookings/status";
import type { QueuedMessage } from "@/lib/admin/messages";
import { VehicleSelect } from "./VehicleSelect";
import { Modal } from "./Modal";
import { BookingMessagePrompt } from "./BookingMessagePrompt";

function toLocalInput(iso: string) {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  });
  return formatter.format(new Date(iso)).replace(" ", "T");
}

/** One legal next status, with the extra fields that edge needs. */
function TransitionForm({
  booking, to, onDone,
}: {
  booking: { id: string; status: BookingStatus; car_slug: string; start_at: string; end_at: string; vehicle_id: string | null; amount_total: number; deposit: number };
  to: BookingStatus;
  onDone: (queued: QueuedMessage | undefined) => void;
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
      onDone(state.queued);
    }
  }, [state.success, state.queued, onDone]);

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

function DepositToggle({
  bookingId, depositReturned, onDone,
}: { bookingId: string; depositReturned: boolean; onDone: (queued: QueuedMessage | undefined) => void }) {
  const [state, action, pending] = useActionState(setDepositReturnedAction, {} as BookingActionState);
  const notified = useRef(false);
  useEffect(() => {
    if (state.success && !notified.current) { notified.current = true; onDone(state.queued); }
  }, [state.success, state.queued, onDone]);
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
  booking,
}: {
  booking: { id: string; status: BookingStatus; car_slug: string; start_at: string; end_at: string; vehicle_id: string | null; amount_total: number; deposit: number; deposit_returned: boolean };
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState<QueuedMessage | null>(null);
  const options = nextStatuses(booking.status);

  const handleDone = (queued: QueuedMessage | undefined) => {
    router.refresh();
    if (queued) setPrompt(queued);
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
        ? <DepositToggle bookingId={booking.id} depositReturned={booking.deposit_returned} onDone={handleDone} />
        : null}
      {!options.length && !(booking.deposit > 0) ? <p className="admin-empty">Nothing left to do here.</p> : null}
    </div>

    {prompt
      ? <BookingMessagePrompt queued={prompt} onClose={() => { setPrompt(null); router.refresh(); }} />
      : null}
  </section>;
}
