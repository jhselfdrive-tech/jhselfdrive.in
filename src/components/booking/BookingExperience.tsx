"use client";

import { useActionState, useEffect, useState } from "react";
import { CalendarCheck, CarFront, Fuel, Gauge, LoaderCircle, MessageCircle, Phone, Search, Users } from "lucide-react";
import { getAvailableFleetAction, type AvailabilityState } from "@/app/actions/fleet-availability";
import type { BookableVehicle } from "@/lib/fleet/public";
import { trackOnce } from "@/lib/analytics";
import { site } from "@/content/site";
import { BookingDialog } from "./BookingDialog";
import { businessWhatsAppUrl } from "@/lib/messages/whatsapp";

/** A `datetime-local` value N days out, at a fixed IST wall-clock hour. */
function localAt(offsetDays: number, time: string) {
  const date = new Date(Date.now() + offsetDays * 86_400_000);
  const ist = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return `${ist}T${time}`;
}

const categoryName = (slug: string) => site.fleet.find((car) => car.slug === slug)?.name || slug;

export function BookingExperience({ initialCategory = "" }: { initialCategory?: string }) {
  const [pickupAt, setPickupAt] = useState(() => localAt(1, "09:00"));
  const [returnAt, setReturnAt] = useState(() => localAt(2, "09:00"));
  const [picked, setPicked] = useState<{ vehicle: BookableVehicle; windowKey: string } | null>(null);
  const [category, setCategory] = useState(initialCategory);

  const [availability, searchAction, searching] = useActionState(getAvailableFleetAction, { ok: false } as AvailabilityState);

  useEffect(() => {
    if (availability.ok && availability.vehicles) trackOnce("booking_dates_selected");
  }, [availability.ok, availability.vehicles]);

  // A fresh search invalidates the open dialog's quote, so the pick is keyed to
  // the window it was made in rather than reset from an effect.
  const windowKey = `${availability.window?.startAt || ""}|${availability.window?.endAt || ""}`;
  const datesMatch = Boolean(availability.window
    && new Date(pickupAt + ":00+05:30").getTime() === new Date(availability.window.startAt).getTime()
    && new Date(returnAt + ":00+05:30").getTime() === new Date(availability.window.endAt).getTime());
  const currentResults = datesMatch && !searching;
  const chosen = currentResults && picked && picked.windowKey === windowKey ? picked.vehicle : null;

  const all = availability.vehicles || [];
  const categories = [...new Set(all.map((vehicle) => vehicle.categorySlug))];
  const visible = category ? all.filter((vehicle) => vehicle.categorySlug === category) : all;

  return <section className="section booking-page">
    <div className="shell">
      <ol className="booking-progress" aria-label="Booking progress">
        <li aria-current={!currentResults ? "step" : undefined}><span>1</span> Your dates</li>
        <li aria-current={currentResults && !chosen ? "step" : undefined}><span>2</span> Choose a car</li>
        <li aria-current={chosen ? "step" : undefined}><span>3</span> Your details</li>
      </ol>
      <form className="booking-searchbar" action={searchAction} onFocus={() => trackOnce("booking_started")}>
        <div className="booking-field">
          <label htmlFor="pickupAt">Pickup date &amp; time</label>
          <input id="pickupAt" name="pickupAt" type="datetime-local" required
            min={localAt(0, "00:00")} value={pickupAt}
            onChange={(event) => {
              setPickupAt(event.target.value);
              // Keep the window valid without a second interaction.
              if (event.target.value && returnAt <= event.target.value) {
                const nextDay = new Date(event.target.value + ":00Z");
                nextDay.setUTCDate(nextDay.getUTCDate() + 1);
                setReturnAt(nextDay.toISOString().slice(0, 16));
              }
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

      {availability.fieldErrors?.pickupAt ? <p className="booking-error booking-error-block" role="alert">{availability.fieldErrors.pickupAt[0]}</p> : null}
      {availability.fieldErrors?.returnAt ? <p className="booking-error booking-error-block" role="alert">{availability.fieldErrors.returnAt[0]}</p> : null}
      {availability.message ? <p className="booking-note booking-note-warning" role="status">{availability.message}</p> : null}
      {availability.ok && !datesMatch ? <p className="booking-note booking-note-warning" role="status">Your dates have changed. Select “Show available cars” to refresh availability and prices.</p> : null}

      {!availability.ok && !availability.message ? <div className="booking-empty-state">
        <CalendarCheck size={34} />
        <h2>Choose your dates to begin</h2>
        <p>We&apos;ll check the whole fleet and show only the cars genuinely free for that window — no phone calls to find out.</p>
      </div> : null}

      {availability.ok && currentResults && all.length ? <>
        <div className="booking-results-bar">
          <div>
            <strong>{visible.length} car{visible.length === 1 ? "" : "s"} available</strong>
            <small>{availability.window?.pickupLabel} → {availability.window?.returnLabel}</small>
          </div>
          {categories.length > 1 ? <div className="booking-filters" role="group" aria-label="Filter by car type">
            <button type="button" aria-pressed={!category} className={category ? "" : "active"} onClick={() => setCategory("")}>All cars</button>
            {categories.map((slug) => <button type="button" aria-pressed={category === slug} key={slug} className={category === slug ? "active" : ""} onClick={() => setCategory(slug)}>
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
              <button className="button button-teal" type="button" onClick={() => setPicked({ vehicle, windowKey })}>
                Book this car
              </button>
            </div>
          </article>)}
        </div>

        {!visible.length ? <p className="booking-note booking-note-warning">
          No {categoryName(category)} is free for those dates. <button type="button" className="booking-inline-button" onClick={() => setCategory("")}>Show all available cars</button>
        </p> : null}
      </> : null}
      <div className="booking-help"><span>Need a hand with your booking?</span><a href={`tel:${site.phoneE164}`}><Phone size={14} /> Call our team</a><a href={businessWhatsAppUrl()} target="_blank" rel="noreferrer"><MessageCircle size={14} /> WhatsApp us</a></div>
    </div>

    {chosen && availability.window ? <BookingDialog
      key={chosen.id}
      vehicle={chosen}
      pickupAt={pickupAt}
      returnAt={returnAt}
      pickupLabel={availability.window.pickupLabel}
      returnLabel={availability.window.returnLabel}
      onClose={() => setPicked(null)}
    /> : null}
  </section>;
}
