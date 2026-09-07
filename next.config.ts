import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { formats: ["image/avif", "image/webp"] },
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
  poweredByHeader: false,
};

export default nextConfig;
