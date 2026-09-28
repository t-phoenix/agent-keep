import type { NextConfig } from "next";

const apiBase = (
  process.env.NEXT_PUBLIC_API_BASE || "https://api.agentkeep.online"
).replace(/\/$/, "");

/** Static export for Cloudflare Pages (marketing site is fully prerendered). */
const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  /**
   * Used by `next dev` only. The exported site does not apply rewrites.
   * Localhost Pay calls `/v1/...` and this forwards them to the API, so the
   * browser does not hit Cloud Run CORS.
   */
  async rewrites() {
    return [
      { source: "/v1/:path*", destination: `${apiBase}/v1/:path*` },
      { source: "/a/:path*", destination: `${apiBase}/a/:path*` },
    ];
  },
};

export default nextConfig;
