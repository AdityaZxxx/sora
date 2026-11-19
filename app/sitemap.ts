import type { MetadataRoute } from "next";

import { siteUrl } from "@/app/layout";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${siteUrl}/privacy`,
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];
}
