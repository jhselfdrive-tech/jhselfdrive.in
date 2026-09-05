"use client";

import { useState } from "react";
import { ArrowRight, CarFront, MapPin, Sparkles } from "lucide-react";
import { site } from "@/content/site";
import { trackOnce } from "@/lib/analytics";

export function HeroTripCard() {
  const [selected, setSelected] = useState<string>(site.fleet[1].slug);
  function continueToEnquiry() {
    window.dispatchEvent(new CustomEvent("jh:select-car", { detail: selected }));
    trackOnce("enquiry_started", { carSlug: selected });
    document.querySelector("#enquire")?.scrollIntoView({ behavior: "smooth" });
  }
  return <aside className="hero-trip-card" aria-label="Quick trip planner"><div className="trip-card-top"><span><Sparkles size={14} /> Quick trip starter</span><small>01 minute</small></div><div className="trip-route"><div className="trip-route-line"><i /><i /></div><div><small>Pickup</small><strong>Ramanathapuram</strong></div><div><small>Your destination</small><strong>Anywhere the road calls</strong></div></div><div className="trip-car-label"><CarFront size={15} /> What fits your journey?</div><div className="trip-car-options">{site.fleet.map((car) => <button className={selected === car.slug ? "active" : ""} type="button" key={car.slug} onClick={() => setSelected(car.slug)}><span>{car.seats}</span>{car.name.replace("City ", "").replace("Compact ", "").replace("Family ", "")}</button>)}</div><button className="trip-continue" type="button" onClick={continueToEnquiry}>Plan my drive <ArrowRight size={16} /></button><div className="trip-card-foot"><span><MapPin size={12} /> Local pickup</span><span>From ₹{site.fleet.find((car) => car.slug === selected)?.dayRate.toLocaleString("en-IN")}/day</span></div></aside>;
}
