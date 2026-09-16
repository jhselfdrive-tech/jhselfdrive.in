"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Fuel, Gauge, Users } from "lucide-react";
import { site, type CarSlug } from "@/content/site";
import { track } from "@/lib/analytics";

export function Fleet({ exclude, photos = {} }: { exclude?: CarSlug; photos?: Record<string, string> } = {}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const cars = exclude ? site.fleet.filter((car) => car.slug !== exclude) : site.fleet;

  useEffect(() => {
    const seen = new Set<string>();
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      const slug = (entry.target as HTMLElement).dataset.slug;
      if (entry.isIntersecting && slug && !seen.has(slug)) { seen.add(slug); track("fleet_card_view", { carSlug: slug }); }
    }), { threshold: .65 });
    gridRef.current?.querySelectorAll("[data-slug]").forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);


  return (
    <div className="fleet-grid" ref={gridRef}>
      {cars.map((car) => (
        <article className="car-card" data-slug={car.slug} key={car.slug}>
          <div className={`car-visual ${car.accent}`}>
            {"popular" in car && car.popular ? <span className="popular">Most requested</span> : null}
            {photos[car.slug]
              // eslint-disable-next-line @next/next/no-img-element -- storage URL, sized by CSS
              ? <img className="car-photo" src={photos[car.slug]} alt={car.name} loading="lazy" />
              : <><div className="road-lines" /><div className="car-silhouette" /></>}
          </div>
          <div className="car-body">
            <div className="car-name-row"><div><h3 className="car-name">{car.name}</h3><p className="car-example">{car.example}</p></div><div className="car-price"><strong>₹{car.dayRate.toLocaleString("en-IN")}</strong><span>starting / day</span></div></div>
            <div className="car-specs"><span><Gauge size={14} /> {car.transmission}</span><span><Users size={14} /> {car.seats} seats</span><span><Fuel size={14} /> {car.fuel}</span></div>
            <Link className="button button-teal" href={`/booking?category=${car.slug}`} onClick={() => track("booking_started", { carSlug: car.slug })}>Check availability</Link>
            <Link className="car-link" href={`/cars/${car.slug}`}>Full details &amp; pricing <ArrowRight size={14} /></Link>
          </div>
        </article>
      ))}
    </div>
  );
}
