"use client";

import { useActionState, useEffect, useState } from "react";
import { ArrowRight, LoaderCircle, LockKeyhole } from "lucide-react";
import { submitEnquiry, type EnquiryState } from "@/app/actions/submit-enquiry";
import { site, type CarSlug } from "@/content/site";
import { getSessionId, trackOnce } from "@/lib/analytics";

const initialState: EnquiryState = { ok: false };
const today = new Date().toISOString().slice(0, 10);

export function EnquiryForm({ defaultCarSlug = site.fleet[1].slug }: { defaultCarSlug?: CarSlug }) {
  const [state, formAction, pending] = useActionState(submitEnquiry, initialState);
  const [started, setStarted] = useState(false);
  const [carSlug, setCarSlug] = useState<string>(defaultCarSlug);
  const [metadata, setMetadata] = useState({ startedAt: "", sessionId: "", utmSource: "", utmMedium: "", utmCampaign: "" });

  useEffect(() => {
    const selectCar = (event: Event) => setCarSlug((event as CustomEvent<string>).detail);
    window.addEventListener("jh:select-car", selectCar);
    return () => window.removeEventListener("jh:select-car", selectCar);
  }, []);

  useEffect(() => {
    if (state.ok && state.whatsappUrl) {
      window.gtag?.("event", "enquiry_submitted", { car_slug: carSlug, event_source: "website" });
      window.location.assign(state.whatsappUrl);
    }
  }, [state, carSlug]);

  function markStarted() {
    if (!started) {
      const params = new URLSearchParams(window.location.search);
      setMetadata({
        startedAt: String(Date.now()), sessionId: getSessionId(), utmSource: params.get("utm_source") || "",
        utmMedium: params.get("utm_medium") || "", utmCampaign: params.get("utm_campaign") || "",
      });
      setStarted(true);
      trackOnce("enquiry_started", { carSlug });
    }
  }

  return (
    <form action={formAction} className="form-card" onFocus={markStarted} noValidate>
      <h3>Tell us your plan</h3>
      <p className="form-intro">We’ll check availability and confirm everything on WhatsApp.</p>
      <input type="hidden" name="startedAt" value={metadata.startedAt} />
      <input type="hidden" name="sessionId" value={metadata.sessionId} />
      <input type="hidden" name="source" value="website" />
      <input type="hidden" name="utmSource" value={metadata.utmSource} />
      <input type="hidden" name="utmMedium" value={metadata.utmMedium} />
      <input type="hidden" name="utmCampaign" value={metadata.utmCampaign} />
      <div className="honeypot" aria-hidden="true"><label htmlFor="website">Website</label><input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
      <div className="form-grid">
        <div className="field field-full">
          <label htmlFor="carSlug">Which car do you need?</label>
          <select id="carSlug" name="carSlug" value={carSlug} onChange={(e) => setCarSlug(e.target.value)} required>
            {site.fleet.map((car) => <option value={car.slug} key={car.slug}>{car.name} — from ₹{car.dayRate.toLocaleString("en-IN")}/day</option>)}
          </select>
          {state.fieldErrors?.carSlug?.[0] ? <span className="field-error">{state.fieldErrors.carSlug[0]}</span> : null}
        </div>
        <div className="field"><label htmlFor="pickupDate">Pickup date</label><input id="pickupDate" name="pickupDate" type="date" min={today} required />{state.fieldErrors?.pickupDate?.[0] ? <span className="field-error">{state.fieldErrors.pickupDate[0]}</span> : null}</div>
        <div className="field"><label htmlFor="returnDate">Return date</label><input id="returnDate" name="returnDate" type="date" min={today} required />{state.fieldErrors?.returnDate?.[0] ? <span className="field-error">{state.fieldErrors.returnDate[0]}</span> : null}</div>
        <div className="field"><label htmlFor="fullName">Your name</label><input id="fullName" name="fullName" type="text" autoComplete="name" placeholder="e.g. Arun Kumar" required />{state.fieldErrors?.fullName?.[0] ? <span className="field-error">{state.fieldErrors.fullName[0]}</span> : null}</div>
        <div className="field"><label htmlFor="phone">Mobile number</label><input id="phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel" placeholder="10-digit number" required />{state.fieldErrors?.phone?.[0] ? <span className="field-error">{state.fieldErrors.phone[0]}</span> : null}</div>
        <div className="field field-full"><label htmlFor="message">Anything we should know? <span style={{fontWeight: 400}}>(optional)</span></label><textarea id="message" name="message" placeholder="Pickup time, route or a question…" maxLength={500} /></div>
      </div>
      {state.message ? <p className="form-status" role="alert">{state.message}</p> : null}
      <button className="button button-primary form-submit" disabled={pending || !metadata.startedAt} type="submit">{pending ? <><LoaderCircle size={17} className="animate-spin" /> Saving your enquiry…</> : <>Check availability <ArrowRight size={17} /></>}</button>
      <p className="privacy"><LockKeyhole size={12} /> Your details stay private and are never sold.</p>
    </form>
  );
}
