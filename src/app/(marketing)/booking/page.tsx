import type { Metadata } from "next";
import { BookingExperience } from "@/components/booking/BookingExperience";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/content/site";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { pageMetadata } from "@/lib/seo/metadata";

const crumbs = [{ name: "Home", path: "/" }, { name: "Book a car", path: "/booking" }] as const;

export const metadata: Metadata = pageMetadata({
  title: `Book a self-drive car in Ramanathapuram | ${site.name}`,
  description: "Choose your pickup and return dates to see every self-drive car actually available, with photos and final prices. No advance payment online.",
  path: "/booking",
  keywords: ["book self drive car ramanathapuram", "self drive car availability", "car rental booking ramanathapuram"],
});

export default async function BookingPage({ searchParams }: PageProps<"/booking">) {
  const query = await searchParams;
  const category = typeof query.category === "string" ? query.category : "";

  return <>
    <JsonLd data={breadcrumbSchema(crumbs)} />
    {/* The site header is absolutely positioned white text, so the page has to
        open on a dark band or the nav is invisible. This one is sized to the
        nav and nothing more, to keep the search above the fold on a phone. */}
    <section className="booking-topbar">
      <div className="shell">
        <h1>Book a self-drive car</h1>
        <p>Pickup in Ramanathapuram · no advance payment online</p>
      </div>
    </section>
    <BookingExperience initialCategory={category} />
  </>;
}
