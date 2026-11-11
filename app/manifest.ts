import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TNEA Compass — Engineering Admissions Guide",
    short_name: "TNEA Compass",
    description:
      "Independent data-first guide to Tamil Nadu engineering admissions. Explore 478 colleges, 7 years of cutoffs, and build an airtight choice list.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
