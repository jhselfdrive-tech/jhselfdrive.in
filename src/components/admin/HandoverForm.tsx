"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ClipboardCheck, LoaderCircle } from "lucide-react";
import { saveHandoverAction, type HandoverActionState } from "@/app/admin/actions/handovers";
import type { BookingHandover, HandoverPhase } from "@/lib/admin/bookings";
import { odometerWarning } from "@/lib/admin/checklist";
import { fuelLabel } from "@/lib/messages/format";
import type { QueuedMessage } from "@/lib/admin/messages";
import { BookingMessagePrompt } from "./BookingMessagePrompt";

export function HandoverForm({ bookingId, phase, handover, previousOdometer }: { bookingId: string; phase: HandoverPhase; handover?: BookingHandover; previousOdometer?: number | null }) {
  const [state, action, pending] = useActionState(saveHandoverAction, {} as HandoverActionState);
  const [prompt, setPrompt] = useState<QueuedMessage | null>(null);
  const handled = useRef<string | null>(null);

  // Saving the checklist is what tells the customer the car is handed over or
  // back, so prompt for that message as soon as it is queued.
  useEffect(() => {
    if (state.success && state.queued && handled.current !== state.queued.id) {
      handled.current = state.queued.id;
      setPrompt(state.queued);
    }
  }, [state.success, state.queued]);
  const [odometer, setOdometer] = useState(handover?.odometer_km?.toString() || "");
  const warning = odometerWarning(previousOdometer, odometer ? Number(odometer) : undefined);
  return <form action={action} className="admin-form-card admin-handover-form">
    <input type="hidden" name="bookingId" value={bookingId} /><input type="hidden" name="phase" value={phase} />
    <div className="admin-card-head"><div><h2>{phase === "delivery" ? "Delivery checklist" : "Return checklist"}</h2><span className="admin-card-subtitle">Every field is optional. Save what is available now.</span></div><ClipboardCheck size={18} /></div>
    <div className="admin-form-grid">
      <div className="admin-field"><label htmlFor={`${phase}-odometer`}>Odometer (km)</label><input id={`${phase}-odometer`} name="odometerKm" type="number" min="0" value={odometer} onChange={(event) => setOdometer(event.target.value)} />{warning ? <small className="admin-field-warning">{warning}</small> : null}</div>
      <div className="admin-field"><label htmlFor={`${phase}-fuel`}>Fuel level</label><select id={`${phase}-fuel`} name="fuelEighths" defaultValue={handover?.fuel_eighths ?? ""}><option value="">Not recorded</option>{Array.from({ length: 9 }, (_, value) => <option value={value} key={value}>{fuelLabel(value)}</option>)}</select></div>
      <label className="admin-check-field"><input name="paymentReceived" type="checkbox" defaultChecked={handover?.payment_received} /> Payment received at {phase}</label>
      <div className="admin-field"><label htmlFor={`${phase}-payment`}>Payment amount (₹)</label><input id={`${phase}-payment`} name="paymentAmount" type="number" min="0" step="0.01" defaultValue={handover?.payment_amount || 0} /></div>
      <div className="admin-field"><label htmlFor={`${phase}-deposit`}>{phase === "delivery" ? "Deposit collected (₹)" : "Deposit refunded (₹)"}</label><input id={`${phase}-deposit`} name="depositAmount" type="number" min="0" step="0.01" defaultValue={handover?.deposit_amount || 0} /></div>
      <div className="admin-field admin-field-full"><label htmlFor={`${phase}-damage`}>Damage / condition notes</label><textarea id={`${phase}-damage`} name="damageNotes" defaultValue={handover?.damage_notes || ""} /></div>
      <div className="admin-field admin-field-full"><label htmlFor={`${phase}-notes`}>Handover notes</label><textarea id={`${phase}-notes`} name="notes" defaultValue={handover?.notes || ""} /></div>
    </div>
    {state.message ? <p className={state.success ? "admin-form-success" : "admin-form-error"}>{state.message}</p> : null}
    {prompt ? <BookingMessagePrompt queued={prompt} onClose={() => setPrompt(null)} /> : null}
    <div className="admin-form-actions"><button className="admin-primary-button" type="submit" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={15} /> : <ClipboardCheck size={15} />} Save {phase}</button></div>
  </form>;
}
