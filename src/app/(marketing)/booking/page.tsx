import type { Metadata } from "next";
import { BookingExperience } from "@/components/booking/BookingExperience";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { pageMetadata } from "@/lib/seo/metadata";

const crumbs = [{ name: "Home", path: "/" }, { name: "Book a car", path: "/booking" }] as const;

export const metadata: Metadata = pageMetadata({
  title: "Book a Self-Drive Car in Ramanathapuram",
  description: "Choose your pickup and return dates to see every self-drive car actually available, with photos and final prices. No advance payment online.",
  path: "/booking",
  keywords: ["book self drive car ramanathapuram", "self drive car availability", "car rental booking ramanathapuram"],
});

export default async function BookingPage({ searchParams }: PageProps<"/booking">) {
  const query = await searchParams;
  const category = typeof query.category === "string" ? query.category : "";

  return <>
    <JsonLd data={breadcrumbSchema(crumbs)} />
    <section className="booking-topbar">
      <div className="shell">
        <h1>Let&apos;s find your car.</h1>
        <p>Pickup in Ramanathapuram · All times in IST · Pay at pickup</p>
      </div>
    </section>
    <BookingExperience initialCategory={category} />
  </>;
}
