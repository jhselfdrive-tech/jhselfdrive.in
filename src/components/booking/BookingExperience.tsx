"use client";

import { useActionState, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarCheck, CarFront, CheckCircle2, Fuel, Gauge, LoaderCircle, MessageCircle, Search, ShieldCheck, Users } from "lucide-react";
import { getAvailableFleetAction, type AvailabilityState } from "@/app/actions/fleet-availability";
import { submitDirectBooking, type BookingState } from "@/app/actions/submit-booking";
import type { BookableVehicle } from "@/lib/fleet/public";
import { getSessionId, track, trackOnce } from "@/lib/analytics";
import { site } from "@/content/site";

/** A `datetime-local` value N days out, at a fixed IST wall-clock hour. */
function localAt(offsetDays: number, time: string) {
  const date = new Date(Date.now() + offsetDays * 86_400_000);
  const ist = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return `${ist}T${time}`;
}

const categoryName = (slug: string) => site.fleet.find((car) => car.slug === slug)?.name || slug;

export function BookingExperience({ initialCategory = "" }: { initialCategory?: string }) {
  const [pickupAt, setPickupAt] = useState(() => localAt(0, "09:00"));
  const [returnAt, setReturnAt] = useState(() => localAt(1, "18:00"));
  const [picked, setPicked] = useState<{ vehicle: BookableVehicle; windowKey: string } | null>(null);
  const [category, setCategory] = useState(initialCategory);
  const [meta, setMeta] = useState({ startedAt: 0, sessionId: "", utmSource: "", utmMedium: "", utmCampaign: "" });

  const [availability, searchAction, searching] = useActionState(getAvailableFleetAction, { ok: false } as AvailabilityState);
  const [booking, bookAction, submitting] = useActionState(submitDirectBooking, { ok: false } as BookingState);

  // The bot gate needs a client timestamp, so stamp it on first interaction.
  function markStarted() {
    if (meta.startedAt) return;
    const params = new URLSearchParams(window.location.search);
    setMeta({
      startedAt: Date.now(),
      sessionId: getSessionId(),
      utmSource: params.get("utm_source") || "",
      utmMedium: params.get("utm_medium") || "",
      utmCampaign: params.get("utm_campaign") || "",
    });
    trackOnce("booking_started");
  }

  useEffect(() => {
    if (availability.ok && availability.vehicles) trackOnce("booking_dates_selected");
  }, [availability.ok, availability.vehicles]);

  // A new search invalidates the previous pick, so the choice is keyed to its
  // window rather than reset from an effect.
  const windowKey = `${availability.window?.startAt || ""}|${availability.window?.endAt || ""}`;
  const chosen = picked && picked.windowKey === windowKey ? picked.vehicle : null;

  const all = availability.vehicles || [];
  const categories = [...new Set(all.map((vehicle) => vehicle.categorySlug))];
  const visible = category ? all.filter((vehicle) => vehicle.categorySlug === category) : all;

  /* ---------------- Confirmation ---------------- */
  if (booking.ok && booking.details) {
    const { details } = booking;
    return <section className="section booking-page">
      <div className="shell booking-confirm">
        <span className="booking-success-icon"><CheckCircle2 size={34} /></span>
        <h2>Request sent, {details.fullName.split(" ")[0]}!</h2>
        <p>We&apos;re checking <strong>{details.carName}</strong> for your dates and will confirm on WhatsApp shortly.</p>
        <dl className="booking-summary">
          <div><dt>Car</dt><dd>{details.carName}</dd></div>
          <div><dt>Pickup</dt><dd>{details.pickupLabel}</dd></div>
          <div><dt>Return</dt><dd>{details.returnLabel}</dd></div>
          <div><dt>Estimated total</dt><dd>₹{details.amountTotal.toLocaleString("en-IN")} · {details.days} day{details.days === 1 ? "" : "s"}</dd></div>
          <div><dt>Refundable deposit</dt><dd>₹{details.deposit.toLocaleString("en-IN")}</dd></div>
        </dl>
        <p className="booking-note">No payment is taken online. Pay at pickup by cash or UPI.</p>
        {booking.whatsappUrl
          ? <a className="button button-teal" href={booking.whatsappUrl} target="_blank" rel="noreferrer" onClick={() => track("whatsapp_click")}><MessageCircle size={17} /> Confirm on WhatsApp</a>
          : null}
      </div>
    </section>;
  }

  /* ---------------- Step 3: who is booking ---------------- */
  if (chosen) {
    return <section className="section booking-page">
      <div className="shell">
        <button type="button" className="booking-back" onClick={() => setPicked(null)}>
          <ArrowLeft size={15} /> Back to available cars
        </button>
        <div className="booking-checkout">
          <form className="booking-panel" action={bookAction} onFocus={markStarted}>
            <h2 className="booking-panel-title">Your details</h2>
            <p className="booking-panel-lede">We only need enough to hold the car and reach you on WhatsApp.</p>

            <input type="hidden" name="vehicleId" value={chosen.id} />
            <input type="hidden" name="pickupAt" value={pickupAt} />
            <input type="hidden" name="returnAt" value={returnAt} />
            <input type="hidden" name="startedAt" value={meta.startedAt} />
            <input type="hidden" name="sessionId" value={meta.sessionId} />
            <input type="hidden" name="utmSource" value={meta.utmSource} />
            <input type="hidden" name="utmMedium" value={meta.utmMedium} />
            <input type="hidden" name="utmCampaign" value={meta.utmCampaign} />
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="booking-honeypot" defaultValue="" />

            <div className="booking-field-grid">
              <div className="booking-field">
                <label htmlFor="fullName">Your name</label>
                <input id="fullName" name="fullName" required minLength={2} maxLength={100} placeholder="Full name as on your licence" />
                {booking.fieldErrors?.fullName ? <small className="booking-error">{booking.fieldErrors.fullName[0]}</small> : null}
              </div>
              <div className="booking-field">
                <label htmlFor="phone">WhatsApp number</label>
                <input id="phone" name="phone" required inputMode="tel" placeholder="98765 43210" />
                {booking.fieldErrors?.phone ? <small className="booking-error">{booking.fieldErrors.phone[0]}</small> : null}
              </div>
              <div className="booking-field">
                <label htmlFor="city">City</label>
                <input id="city" name="city" defaultValue="Ramanathapuram" maxLength={100} />
              </div>
              <div className="booking-field booking-field-full">
                <label htmlFor="notes">Trip notes <span className="booking-optional">Optional</span></label>
                <textarea id="notes" name="notes" maxLength={500} placeholder="Route, pickup time flexibility, extra driver…" />
              </div>
            </div>

            {booking.message ? <p className="booking-error booking-error-block" role="alert">{booking.message}</p> : null}
            <button className="button button-teal booking-submit" type="submit" disabled={submitting || !meta.startedAt}>
              {submitting ? <><LoaderCircle size={18} className="spin" /> Sending…</> : <>Request this car <ArrowRight size={18} /></>}
            </button>
            <p className="booking-note">No online payment. Our team confirms availability on WhatsApp before pickup.</p>
          </form>

          <aside className="booking-aside">
            <div className="booking-aside-card">
              {chosen.photoUrl
                // eslint-disable-next-line @next/next/no-img-element -- storage URL, sized by CSS
                ? <img src={chosen.photoUrl} alt={chosen.name} />
                : <span className="booking-aside-placeholder"><CarFront size={38} /></span>}
              <div className="booking-aside-body">
                <h3>{chosen.name}</h3>
                {chosen.tagline ? <p>{chosen.tagline}</p> : chosen.model ? <p>{chosen.model}</p> : null}
                <dl className="booking-summary">
                  <div><dt>Pickup</dt><dd>{availability.window?.pickupLabel}</dd></div>
                  <div><dt>Return</dt><dd>{availability.window?.returnLabel}</dd></div>
                  <div><dt>Day rate</dt><dd>₹{chosen.dayRate.toLocaleString("en-IN")} × {chosen.days}</dd></div>
                  <div className="booking-summary-total"><dt>Estimated total</dt><dd>₹{chosen.amountTotal.toLocaleString("en-IN")}</dd></div>
                  <div><dt>Refundable deposit</dt><dd>₹{chosen.deposit.toLocaleString("en-IN")}</dd></div>
                </dl>
                <p className="booking-note"><ShieldCheck size={14} /> Paid at pickup by cash or UPI — nothing is charged now.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>;
  }

  /* ---------------- Steps 1 & 2: dates, then results ---------------- */
  return <section className="section booking-page">
    <div className="shell">
      <form className="booking-searchbar" action={searchAction} onFocus={markStarted}>
        <div className="booking-field">
          <label htmlFor="pickupAt">Pickup date &amp; time</label>
          <input id="pickupAt" name="pickupAt" type="datetime-local" required
            min={localAt(0, "00:00")} value={pickupAt}
            onChange={(event) => {
              setPickupAt(event.target.value);
              // Keep the window valid without a second interaction.
              if (event.target.value && returnAt <= event.target.value) setReturnAt(`${event.target.value.slice(0, 10)}T18:00`);
            }} />
        </div>
        <div className="booking-field">
          <label htmlFor="returnAt">Return date &amp; time</label>
          <input id="returnAt" name="returnAt" type="datetime-local" required
            min={pickupAt} value={returnAt}
            onChange={(event) => setReturnAt(event.target.value)} />
        </div>
        <button className="button button-teal booking-search-button" type="submit" disabled={searching}>
          {searching ? <><LoaderCircle size={18} className="spin" /> Checking…</> : <><Search size={18} /> Show available cars</>}
        </button>
      </form>

      {availability.fieldErrors?.returnAt ? <p className="booking-error booking-error-block" role="alert">{availability.fieldErrors.returnAt[0]}</p> : null}
      {availability.message ? <p className="booking-note booking-note-warning" role="status">{availability.message}</p> : null}

      {!availability.ok && !availability.message ? <div className="booking-empty-state">
        <CalendarCheck size={34} />
        <h2>Choose your dates to begin</h2>
        <p>We&apos;ll check the whole fleet and show only the cars genuinely free for that window — no phone calls to find out.</p>
      </div> : null}

      {availability.ok && all.length ? <>
        <div className="booking-results-bar">
          <div>
            <strong>{visible.length} car{visible.length === 1 ? "" : "s"} available</strong>
            <small>{availability.window?.pickupLabel} → {availability.window?.returnLabel}</small>
          </div>
          {categories.length > 1 ? <div className="booking-filters" role="group" aria-label="Filter by car type">
            <button type="button" className={category ? "" : "active"} onClick={() => setCategory("")}>All cars</button>
            {categories.map((slug) => <button type="button" key={slug} className={category === slug ? "active" : ""} onClick={() => setCategory(slug)}>
              {categoryName(slug)}
            </button>)}
          </div> : null}
        </div>

        <div className="booking-vehicle-grid">
          {visible.map((vehicle) => <article className="booking-vehicle-card" key={vehicle.id}>
            <div className="booking-vehicle-photo">
              {vehicle.photoUrl
                // eslint-disable-next-line @next/next/no-img-element -- storage URL, sized by CSS
                ? <img src={vehicle.photoUrl} alt={vehicle.name} loading="lazy" />
                : <span className="booking-vehicle-placeholder"><CarFront size={40} /></span>}
              <span className="booking-vehicle-tag">{categoryName(vehicle.categorySlug)}</span>
            </div>
            <div className="booking-vehicle-body">
              <h3>{vehicle.name}</h3>
              {vehicle.tagline ? <p>{vehicle.tagline}</p> : vehicle.model ? <p>{vehicle.model}</p> : null}
              <div className="booking-vehicle-specs">
                {vehicle.seats ? <span><Users size={14} /> {vehicle.seats} seats</span> : null}
                {vehicle.fuel ? <span><Fuel size={14} /> {vehicle.fuel}</span> : null}
                {vehicle.transmission ? <span><Gauge size={14} /> {vehicle.transmission}</span> : null}
              </div>
              <div className="booking-vehicle-price">
                <div>
                  <strong>₹{vehicle.amountTotal.toLocaleString("en-IN")}</strong>
                  <small>₹{vehicle.dayRate.toLocaleString("en-IN")}/day · {vehicle.days} day{vehicle.days === 1 ? "" : "s"}</small>
                </div>
                <small className="booking-vehicle-deposit">+ ₹{vehicle.deposit.toLocaleString("en-IN")} refundable deposit</small>
              </div>
              <button className="button button-teal" type="button" onClick={() => { markStarted(); setPicked({ vehicle, windowKey }); }}>
                Book this car <ArrowRight size={16} />
              </button>
            </div>
          </article>)}
        </div>

        {!visible.length ? <p className="booking-note booking-note-warning">
          No {categoryName(category)} is free for those dates. <button type="button" className="booking-inline-button" onClick={() => setCategory("")}>Show all available cars</button>
        </p> : null}
      </> : null}
    </div>
  </section>;
}
