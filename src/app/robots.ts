import type { MetadataRoute } from "next";
import { site } from "@/content/site";
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin/", "/r/"] }, sitemap: `${site.siteUrl}/sitemap.xml` }; }
