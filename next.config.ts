import type { NextConfig } from "next";

// Fleet photos live in the public Supabase storage bucket, so next/image needs
// that host on the allowlist.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
  poweredByHeader: false,
};

export default nextConfig;
