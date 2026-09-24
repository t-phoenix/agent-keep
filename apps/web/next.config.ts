import type { NextConfig } from "next";

/** Static export for Cloudflare Pages (marketing site is fully prerendered). */
const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
