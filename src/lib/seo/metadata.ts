import type { Metadata } from "next";
import { site } from "@/content/site";

const OG_IMAGE = { url: "/opengraph-image", width: 1200, height: 630 };

type PageMetaInput = { title: string; description: string; path: string; keywords?: readonly string[]; ogTitle?: string; ogImage?: string };

/**
 * Builds a complete Metadata object for one page.
 *
 * Next merges metadata shallowly and replaces whole keys, so a page that sets only
 * `openGraph.title` would wipe the layout's images/siteName/locale/type. Every page
 * therefore routes through this builder instead of hand-writing openGraph/twitter,
 * and every page sets its own canonical — the root layout deliberately sets none.
 */
export function pageMetadata({ title, description, path, keywords, ogTitle, ogImage }: PageMetaInput): Metadata {
  const images = [ogImage ? { url: ogImage, width: 1200, height: 630 } : OG_IMAGE];
  return {
    title, description,
    ...(keywords?.length ? { keywords: [...keywords] } : {}),
    alternates: { canonical: path },
    openGraph: { title: ogTitle ?? title, description, url: path, siteName: site.name, locale: "en_IN", type: "website", images },
    twitter: { card: "summary_large_image", title: ogTitle ?? title, description, images: images.map((image) => image.url) },
  };
}
