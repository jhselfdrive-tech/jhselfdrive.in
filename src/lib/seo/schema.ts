import { site, type CarSlug } from "@/content/site";

export const BUSINESS_ID = `${site.siteUrl}/#business`;
export const WEBSITE_ID = `${site.siteUrl}/#website`;

export function absoluteUrl(path: string) { return new URL(path, site.siteUrl).toString(); }

type Faq = { question: string; answer: string };
export type Crumb = { name: string; path: string };

/** AutoRental + WebSite. Rendered once in the root layout — one entity, one @id, referenced by every page-level node. */
export function businessGraph() {
  return [
    {
      "@context": "https://schema.org", "@type": "AutoRental", "@id": BUSINESS_ID,
      name: site.name, description: site.description, url: site.siteUrl, logo: absoluteUrl("/icon"), image: absoluteUrl("/opengraph-image"),
      telephone: site.phoneE164, email: site.email,
      address: { "@type": "PostalAddress", streetAddress: site.address, addressLocality: "Ramanathapuram", addressRegion: "Tamil Nadu", postalCode: "623501", addressCountry: "IN" },
      geo: { "@type": "GeoCoordinates", latitude: 9.3639, longitude: 78.8395 },
      areaServed: site.serviceAreas.map((name) => ({ "@type": "City", name })),
      priceRange: "₹₹", currenciesAccepted: "INR",
      openingHoursSpecification: [{ "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], opens: "07:00", closes: "22:00" }],
    },
    { "@context": "https://schema.org", "@type": "WebSite", "@id": WEBSITE_ID, name: site.name, url: site.siteUrl, inLanguage: "en-IN", publisher: { "@id": BUSINESS_ID } },
  ];
}

export function faqSchema(items: readonly Faq[]) {
  return {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: items.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })),
  };
}

export function breadcrumbSchema(crumbs: readonly Crumb[]) {
  return {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({ "@type": "ListItem", position: index + 1, name: crumb.name, item: absoluteUrl(crumb.path) })),
  };
}

type FleetCar = (typeof site.fleet)[number];

export function carSchema(car: FleetCar, description: string) {
  const url = absoluteUrl(`/cars/${car.slug}`);
  return {
    "@context": "https://schema.org", "@type": "Product", "@id": `${url}#product`,
    name: `${car.name} — self-drive rental`, description, url, category: "Self-drive car rental",
    brand: { "@type": "Brand", name: site.name },
    additionalProperty: [
      { "@type": "PropertyValue", name: "Transmission", value: car.transmission },
      { "@type": "PropertyValue", name: "Seats", value: String(car.seats) },
      { "@type": "PropertyValue", name: "Fuel", value: car.fuel },
      { "@type": "PropertyValue", name: "Included distance", value: site.pricing.includedKm },
    ],
    offers: {
      "@type": "Offer", url, availability: "https://schema.org/InStock", priceCurrency: "INR",
      priceSpecification: { "@type": "UnitPriceSpecification", price: car.dayRate, priceCurrency: "INR", unitCode: "DAY", referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "DAY" } },
      seller: { "@id": BUSINESS_ID },
    },
  };
}

export function serviceAreaSchema({ city, slug, description }: { city: string; slug: string; description: string }) {
  return {
    "@context": "https://schema.org", "@type": "Service", "@id": `${absoluteUrl(`/${slug}`)}#service`,
    name: `Self-drive car rental in ${city}`, serviceType: "Self-drive car rental", description,
    url: absoluteUrl(`/${slug}`), provider: { "@id": BUSINESS_ID },
    areaServed: { "@type": "City", name: city, containedInPlace: { "@type": "AdministrativeArea", name: "Ramanathapuram district, Tamil Nadu" } },
  };
}

export function carItemListSchema(slugs: readonly CarSlug[]) {
  return {
    "@context": "https://schema.org", "@type": "ItemList", name: `${site.name} fleet`,
    itemListElement: slugs.map((slug, index) => ({ "@type": "ListItem", position: index + 1, url: absoluteUrl(`/cars/${slug}`) })),
  };
}
