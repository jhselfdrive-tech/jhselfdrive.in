"use client";

import Link from "next/link";
import { ArrowRight, MapPin, Sparkles } from "lucide-react";
import { site } from "@/content/site";
import { trackOnce } from "@/lib/analytics";

const lowestRate = Math.min(...site.fleet.map((car) => car.dayRate));

export function HeroTripCard() {
  return <aside className="hero-trip-card" aria-label="Quick trip planner">
    <div className="trip-card-top"><span><Sparkles size={14} /> Direct booking</span><small>Instant WhatsApp</small></div>
    <div className="trip-route">
      <div className="trip-route-line"><i /><i /></div>
      <div><small>Pickup</small><strong>Ramanathapuram</strong></div>
      <div><small>Your destination</small><strong>Anywhere the road calls</strong></div>
    </div>
    <p className="trip-card-copy">Tell us your dates and see every car actually free — with photos and the final price.</p>
    <Link className="trip-continue" href="/booking" onClick={() => trackOnce("booking_started")}>
      Check availability <ArrowRight size={16} />
    </Link>
    <div className="trip-card-foot">
      <span><MapPin size={12} /> Local Ramanathapuram pickup</span>
      <span>From ₹{lowestRate.toLocaleString("en-IN")}/day</span>
    </div>
  </aside>;
}
