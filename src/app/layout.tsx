import type { Metadata, Viewport } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/content/site";
import { businessGraph } from "@/lib/seo/schema";
import "./globals.css";

// No `alternates.canonical` here on purpose: a canonical set on the root layout is
// inherited by every page that forgets its own, silently pointing sub-pages at "/".
// Each page supplies its own via pageMetadata().
export const metadata: Metadata = {
  metadataBase: new URL(site.siteUrl),
  title: { default: "Self Drive Car Rental in Ramanathapuram | JH Self Drive", template: "%s | JH Self Drive" },
  description: site.description,
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } } : {}),
};

export const viewport: Viewport = { themeColor: "#0d665d", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" data-scroll-behavior="smooth"><body>{children}<JsonLd data={businessGraph()} />{process.env.NEXT_PUBLIC_GA_ID ? <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} /> : null}</body></html>
  );
}
