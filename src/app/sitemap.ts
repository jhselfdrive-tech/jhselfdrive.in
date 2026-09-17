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
    entry("/booking", 0.9, "weekly", new Date()),
    entry("/cars", 0.8, "monthly", new Date()),
    entry("/self-drive-car-rental-madurai", 0.7, "monthly", new Date("2026-09-17")),
    entry("/outstation-self-drive-car-rental", 0.7, "monthly", new Date("2026-09-17")),
    ...site.fleet.map((car) => entry(`/cars/${car.slug}`, 0.8, "monthly", new Date(carContent[car.slug].updatedAt))),
    ...locations.map((location) => entry(`/${location.slug}`, 0.7, "monthly", new Date(location.updatedAt))),
  ];
}
