import type { MetadataRoute } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ??
  "http://localhost:3000";

const ROUTES = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/assistant", priority: 0.9, changeFrequency: "monthly" },
  { path: "/colleges", priority: 0.9, changeFrequency: "monthly" },
  { path: "/cutoffs", priority: 0.9, changeFrequency: "monthly" },
  { path: "/predictor", priority: 0.8, changeFrequency: "monthly" },
  { path: "/compare", priority: 0.7, changeFrequency: "monthly" },
  { path: "/pathways", priority: 0.7, changeFrequency: "yearly" },
  { path: "/about", priority: 0.5, changeFrequency: "yearly" },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ROUTES.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
