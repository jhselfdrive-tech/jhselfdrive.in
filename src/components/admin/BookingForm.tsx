"use client";

import { useActionState, useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { createBookingAction, type BookingActionState } from "@/app/admin/actions/bookings";
import { site } from "@/content/site";
import { VehicleSelect } from "./VehicleSelect";

function initialTimes() {
  const today = new Date().toISOString().slice(0, 10);
  return { startAt: `${today}T09:00`, endAt: `${today}T18:00` };
}

export function BookingForm({ customerId }: { customerId: string }) {
  const defaults = initialTimes();
  const [state, action, pending] = useActionState(createBookingAction, {} as BookingActionState);
  const [categorySlug, setCategorySlug] = useState<string>(site.fleet[0].slug);
  const [startAt, setStartAt] = useState(defaults.startAt);
  const [endAt, setEndAt] = useState(defaults.endAt);

  return <form className="admin-form-card" action={action}>
    <h2>Record a booking</h2>
    <p>Add a walk-in or phone rental to keep revenue and customer segments accurate.</p>
    <input type="hidden" name="customerId" value={customerId} />
    <div className="admin-form-grid">
      <div className="admin-field admin-field-full">
        <label htmlFor="booking-car">Vehicle category</label>
        <select id="booking-car" name="carSlug" value={categorySlug} onChange={(event) => setCategorySlug(event.target.value)}>
          {site.fleet.map((car) => <option value={car.slug} key={car.slug}>{car.name}</option>)}
        </select>
      </div>
      <div className="admin-field">
        <label htmlFor="booking-start">Pickup date & time</label>
        <input id="booking-start" type="datetime-local" name="startAt" value={startAt} onChange={(event) => setStartAt(event.target.value)} required />
      </div>
      <div className="admin-field">
        <label htmlFor="booking-end">Return date & time</label>
        <input id="booking-end" type="datetime-local" name="endAt" value={endAt} min={startAt} onChange={(event) => setEndAt(event.target.value)} required />
      </div>
      <VehicleSelect categorySlug={categorySlug} startAt={startAt} endAt={endAt} />
      <div className="admin-field">
        <label htmlFor="booking-amount">Total amount (₹)</label>
        <input id="booking-amount" type="number" name="amountTotal" min="0" step="0.01" placeholder="6500" required />
      </div>
      <div className="admin-field">
        <label htmlFor="booking-deposit">Deposit (₹)</label>
        <input id="booking-deposit" type="number" name="deposit" min="0" step="0.01" defaultValue="5000" required />
      </div>
      <div className="admin-field admin-field-full">
        <label htmlFor="booking-status">Booking status</label>
        <select id="booking-status" name="status" defaultValue="confirmed">
          <option value="approved">Approved</option><option value="confirmed">Confirmed</option><option value="ongoing">On trip</option><option value="completed">Completed</option>
        </select>
      </div>
      <div className="admin-field admin-field-full">
        <label htmlFor="booking-notes">Notes</label>
        <textarea id="booking-notes" name="notes" placeholder="Payment notes, pickup details or special requests…" />
      </div>
    </div>
    {state.message ? <p className="admin-form-error" role="alert">{state.message}</p> : null}
    <div className="admin-form-actions">
      <button className="admin-primary-button" disabled={pending} type="submit">
        {pending ? <><LoaderCircle size={15} className="animate-spin" /> Saving…</> : <>Create booking <ArrowRight size={15} /></>}
      </button>
    </div>
  </form>;
}
