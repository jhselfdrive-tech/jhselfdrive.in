"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { IndianRupee, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { deletePaymentAction, recordPaymentAction, type PaymentActionState } from "@/app/admin/actions/payments";
import { PAYMENT_KIND_LABEL, PAYMENT_METHOD_LABEL, type BookingPayment } from "@/lib/bookings/payments";
import { formatInr, formatIstDateTime } from "@/lib/messages/format";
import type { QueuedMessage } from "@/lib/admin/messages";
import { BookingMessagePrompt } from "./BookingMessagePrompt";

function DeletePayment({ payment }: { payment: BookingPayment }) {
  const [state, action, pending] = useActionState(deletePaymentAction, {} as PaymentActionState);
  // Handover-sourced entries are edited on the checklist, not here.
  if (payment.handover_id) return <small className="admin-table-detail">From checklist</small>;
  return <form action={action}>
    <input type="hidden" name="id" value={payment.id} />
    <button className="admin-icon-button admin-icon-button-danger" type="submit" disabled={pending} aria-label="Remove payment">
      {pending ? <LoaderCircle size={13} className="animate-spin" /> : <Trash2 size={13} />}
    </button>
    {state.message && !state.success ? <small className="admin-field-warning">{state.message}</small> : null}
  </form>;
}

export function PaymentLedgerPanel({
  bookingId, payments, total, collected, balance, deposit,
}: {
  bookingId: string;
  payments: BookingPayment[];
  total: number;
  collected: number;
  balance: number;
  deposit: number;
}) {
  const [state, action, pending] = useActionState(recordPaymentAction, {} as PaymentActionState);
  const [prompt, setPrompt] = useState<QueuedMessage | null>(null);
  const handled = useRef<string | null>(null);

  // Recording a payment queues the customer's receipt; prompt for it once.
  useEffect(() => {
    if (state.success && state.queued && handled.current !== state.queued.id) {
      handled.current = state.queued.id;
      setPrompt(state.queued);
    }
  }, [state.success, state.queued]);

  return <section className="admin-form-card">
    <div className="admin-card-head">
      <div><h2>Payments</h2><span className="admin-card-subtitle">Every entry messages the customer with the running balance.</span></div>
      <IndianRupee size={18} />
    </div>

    <dl className="admin-payment-summary">
      <div><dt>Rental total</dt><dd>{formatInr(total)}</dd></div>
      <div><dt>Collected</dt><dd>{formatInr(collected)}</dd></div>
      <div className={balance > 0 ? "admin-payment-outstanding" : undefined}>
        <dt>Balance</dt><dd>{formatInr(balance)}</dd>
      </div>
      <div><dt>Deposit held</dt><dd>{formatInr(deposit)}</dd></div>
    </dl>

    <ul className="admin-payment-list">
      {payments.map((payment) => <li key={payment.id}>
        <div>
          <strong>{formatInr(payment.amount)} · {PAYMENT_KIND_LABEL[payment.kind]}</strong>
          <small>{PAYMENT_METHOD_LABEL[payment.method]} · {formatIstDateTime(payment.received_at)} · {payment.recorded_by}</small>
          {payment.note ? <small className="admin-table-detail">{payment.note}</small> : null}
        </div>
        <DeletePayment payment={payment} />
      </li>)}
      {!payments.length ? <li className="admin-empty">No payments recorded yet.</li> : null}
    </ul>

    <form action={action} className="admin-payment-form">
      <input type="hidden" name="bookingId" value={bookingId} />
      <div className="admin-form-grid">
        <div className="admin-field">
          <label htmlFor="payment-amount">Amount (₹)</label>
          <input id="payment-amount" name="amount" type="number" min="1" step="1" required placeholder="2000" />
        </div>
        <div className="admin-field">
          <label htmlFor="payment-kind">For</label>
          <select id="payment-kind" name="kind" defaultValue="rental">
            <option value="rental">Rental payment</option>
            <option value="deposit">Refundable deposit</option>
            <option value="refund">Deposit refund</option>
          </select>
        </div>
        <div className="admin-field">
          <label htmlFor="payment-method">Method</label>
          <select id="payment-method" name="method" defaultValue="cash">
            <option value="cash">Cash</option><option value="upi">UPI</option>
            <option value="bank">Bank transfer</option><option value="other">Other</option>
          </select>
        </div>
        <div className="admin-field">
          <label htmlFor="payment-note">Note</label>
          <input id="payment-note" name="note" maxLength={300} placeholder="Advance over UPI" />
        </div>
      </div>
      {state.message ? <p className={state.success ? "admin-form-success" : "admin-form-error"} role="status">{state.message}</p> : null}
      <div className="admin-form-actions">
        <button className="admin-primary-button" type="submit" disabled={pending}>
          {pending ? <LoaderCircle size={15} className="animate-spin" /> : <Plus size={15} />} Record payment
        </button>
      </div>
    </form>

    {prompt ? <BookingMessagePrompt queued={prompt} onClose={() => setPrompt(null)} /> : null}
  </section>;
}
