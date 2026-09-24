import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://agentkeep.online";
  const lastModified = new Date("2026-09-25");
  return [
    { url: site, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${site}/skill`, lastModified, changeFrequency: "monthly", priority: 0.8 },
  ];
}
