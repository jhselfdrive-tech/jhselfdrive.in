"use client";

import { useActionState, useState } from "react";
import { ArrowRight, CarFront, CheckCircle2, LoaderCircle, MessageCircle, ShieldCheck, X } from "lucide-react";
import { submitDirectBooking, type BookingState } from "@/app/actions/submit-booking";
import type { BookableVehicle } from "@/lib/fleet/public";
import { getSessionId, track } from "@/lib/analytics";
import { closeOnBackdropClick, useDialogElement } from "@/components/use-dialog";

const inr = (value: number) => `₹${value.toLocaleString("en-IN")}`;

type Props = {
  vehicle: BookableVehicle;
  /** The `datetime-local` window the customer searched with. */
  pickupAt: string;
  returnAt: string;
  pickupLabel: string;
  returnLabel: string;
  onClose: () => void;
};

export function BookingDialog({ vehicle, pickupAt, returnAt, pickupLabel, returnLabel, onClose }: Props) {
  const [state, action, pending] = useActionState(submitDirectBooking, { ok: false } as BookingState);
  const ref = useDialogElement(true, onClose);

  // The bot gate measures time-on-form, so the clock starts when the dialog
  // opens rather than on page load.
  const [meta] = useState(() => {
    const params = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
    return {
      startedAt: Date.now(),
      sessionId: getSessionId(),
      utmSource: params.get("utm_source") || "",
      utmMedium: params.get("utm_medium") || "",
      utmCampaign: params.get("utm_campaign") || "",
    };
  });

  const subtotal = vehicle.amountTotal;
  const dueAtPickup = subtotal + vehicle.deposit;

  return <dialog ref={ref} className="booking-dialog" onClick={closeOnBackdropClick} aria-label={`Book the ${vehicle.name}`}>
    <button type="button" className="booking-dialog-close" onClick={() => ref.current?.close()} aria-label="Close">
      <X size={18} />
    </button>

    {state.ok && state.details ? (
      <div className="booking-dialog-done">
        <span className="booking-success-icon"><CheckCircle2 size={32} /></span>
        <h2>Request sent, {state.details.fullName.split(" ")[0]}!</h2>
        <p>We&apos;re holding <strong>{state.details.carName}</strong> while we confirm, and we&apos;ll message you on WhatsApp shortly.</p>
        <dl className="booking-summary">
          <div><dt>Pickup</dt><dd>{state.details.pickupLabel}</dd></div>
          <div><dt>Return</dt><dd>{state.details.returnLabel}</dd></div>
          <div><dt>Rental</dt><dd>{inr(state.details.amountTotal)}</dd></div>
          <div><dt>Refundable deposit</dt><dd>{inr(state.details.deposit)}</dd></div>
        </dl>
        {state.whatsappUrl
          ? <a className="button button-teal" href={state.whatsappUrl} target="_blank" rel="noreferrer" onClick={() => track("whatsapp_click")}>
              <MessageCircle size={17} /> Confirm on WhatsApp
            </a>
          : null}
        <button type="button" className="booking-dialog-secondary" onClick={() => ref.current?.close()}>Back to available cars</button>
      </div>
    ) : (
      <>
        <div className="booking-dialog-car">
          {vehicle.photoUrl
            // eslint-disable-next-line @next/next/no-img-element -- storage URL, sized by CSS
            ? <img src={vehicle.photoUrl} alt="" />
            : <span className="booking-dialog-car-placeholder"><CarFront size={24} /></span>}
          <div>
            <strong>{vehicle.name}</strong>
            <small>{pickupLabel} → {returnLabel}</small>
          </div>
        </div>

        <dl className="booking-summary booking-dialog-quote">
          <div>
            <dt>{inr(vehicle.dayRate)} × {vehicle.days} day{vehicle.days === 1 ? "" : "s"}</dt>
            <dd>{inr(subtotal)}</dd>
          </div>
          <div><dt>Refundable deposit</dt><dd>{inr(vehicle.deposit)}</dd></div>
          <div className="booking-summary-total"><dt>Total due at pickup</dt><dd>{inr(dueAtPickup)}</dd></div>
        </dl>
        <p className="booking-dialog-fineprint">
          <ShieldCheck size={14} /> Nothing is charged now. {inr(vehicle.deposit)} of this comes back to you after the car is returned.
        </p>

        <form action={action} className="booking-dialog-form">
          <input type="hidden" name="vehicleId" value={vehicle.id} />
          <input type="hidden" name="pickupAt" value={pickupAt} />
          <input type="hidden" name="returnAt" value={returnAt} />
          <input type="hidden" name="startedAt" value={meta.startedAt} />
          <input type="hidden" name="sessionId" value={meta.sessionId} />
          <input type="hidden" name="utmSource" value={meta.utmSource} />
          <input type="hidden" name="utmMedium" value={meta.utmMedium} />
          <input type="hidden" name="utmCampaign" value={meta.utmCampaign} />
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="booking-honeypot" defaultValue="" />

          <div className="booking-field">
            <label htmlFor="dialog-name">Your name</label>
            <input id="dialog-name" name="fullName" required minLength={2} maxLength={100} autoComplete="name" placeholder="Name as on your licence" />
            {state.fieldErrors?.fullName ? <small className="booking-error">{state.fieldErrors.fullName[0]}</small> : null}
          </div>
          <div className="booking-dialog-row">
            <div className="booking-field">
              <label htmlFor="dialog-phone">WhatsApp number</label>
              <input id="dialog-phone" name="phone" required inputMode="tel" autoComplete="tel" maxLength={40} aria-describedby="dialog-phone-help" placeholder="+91 98765 43210" />
              <small id="dialog-phone-help">Indian mobiles: 10 digits. International numbers: include the country code, e.g. +44 7700 900123.</small>
              {state.fieldErrors?.phone ? <small className="booking-error">{state.fieldErrors.phone[0]}</small> : null}
            </div>
            <div className="booking-field">
              <label htmlFor="dialog-city">City</label>
              <input id="dialog-city" name="city" defaultValue="Ramanathapuram" maxLength={100} autoComplete="address-level2" />
            </div>
          </div>
          <div className="booking-field">
            <label htmlFor="dialog-notes">Trip notes <span className="booking-optional">Optional</span></label>
            <textarea id="dialog-notes" name="notes" maxLength={500} rows={2} placeholder="Route, pickup flexibility, extra driver…" />
          </div>

          {state.message ? <p className="booking-error booking-error-block" role="alert">{state.message}</p> : null}

          <button className="button button-teal booking-dialog-submit" type="submit" disabled={pending}>
            {pending ? <><LoaderCircle size={18} className="spin" /> Sending…</> : <>Request this car <ArrowRight size={18} /></>}
          </button>
          <small className="booking-dialog-reassure">We confirm availability on WhatsApp before you pay anything.</small>
        </form>
      </>
    )}
  </dialog>;
}
