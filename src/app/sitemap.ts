import type { MetadataRoute } from "next";
import { absoluteUrl, SITE_OG_IMAGE_PATH, SITE_URL } from "@/lib/marketing/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
      images: [absoluteUrl(SITE_OG_IMAGE_PATH)],
    },
  ];
}
