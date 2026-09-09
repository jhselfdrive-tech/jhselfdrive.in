import type { MetadataRoute } from "next";
import { site } from "@/content/site";
import { carContent } from "@/content/cars";
import { locations } from "@/content/locations";
import { absoluteUrl } from "@/lib/seo/schema";

type Entry = MetadataRoute.Sitemap[number];

const entry = (path: string, priority: number, changeFrequency: Entry["changeFrequency"], lastModified: Date): Entry =>
  ({ url: absoluteUrl(path), lastModified, changeFrequency, priority });

// lastModified comes from the content files, not `new Date()` — a sitemap that claims every
// page changed on every deploy gets its lastmod ignored.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    entry("/", 1, "weekly", new Date()),
    entry("/cars", 0.8, "monthly", new Date()),
    ...site.fleet.map((car) => entry(`/cars/${car.slug}`, 0.8, "monthly", new Date(carContent[car.slug].updatedAt))),
    ...locations.map((location) => entry(`/${location.slug}`, 0.7, "monthly", new Date(location.updatedAt))),
  ];
}
