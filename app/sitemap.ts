import type { MetadataRoute } from "next";

import { getCollegeOptions } from "@/lib/db/queries";

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = ROUTES.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // A database failure must not take the whole sitemap down. The static routes
  // are still useful, and the college pages are discovered from the explorer.
  const colleges = await getCollegeOptions().catch(() => []);

  const collegeRoutes: MetadataRoute.Sitemap = colleges.map((college) => ({
    url: `${siteUrl}/colleges/${college.code}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...collegeRoutes];
}
