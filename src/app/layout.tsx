import type { Metadata, Viewport } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { site } from "@/content/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.siteUrl),
  title: { default: "Self Drive Car Rental in Ramanathapuram | JH Self Drive", template: "%s | JH Self Drive" },
  description: site.description,
  alternates: { canonical: "/" },
  keywords: ["self drive car Ramanathapuram", "car rental Ramanathapuram", "self drive car Rameswaram", "JH Self Drive"],
  openGraph: { title: "Your road. Your time. | JH Self Drive", description: site.description, url: "/", siteName: site.name, locale: "en_IN", type: "website", images: [{ url: "/opengraph-image", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", title: "JH Self Drive — Ramanathapuram", description: site.description, images: ["/opengraph-image"] },
};

export const viewport: Viewport = { themeColor: "#0d665d", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const jsonLd = {
    "@context": "https://schema.org", "@type": "AutoRental", name: site.name, description: site.description,
    url: site.siteUrl, telephone: site.phoneE164, email: site.email, address: { "@type": "PostalAddress", addressLocality: "Ramanathapuram", addressRegion: "Tamil Nadu", postalCode: "623501", addressCountry: "IN" },
    geo: { "@type": "GeoCoordinates", latitude: 9.3639, longitude: 78.8395 },
    areaServed: site.serviceAreas.map((name) => ({ "@type": "City", name })), priceRange: "₹₹",
    openingHoursSpecification: [{ "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], opens: "07:00", closes: "22:00" }],
  };
  return (
    <html lang="en" data-scroll-behavior="smooth"><body>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />{process.env.NEXT_PUBLIC_GA_ID ? <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} /> : null}</body></html>
  );
}
