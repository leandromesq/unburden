import type { MetadataRoute } from "next";
import {
  absoluteUrl,
  SITE_INDEXABLE_ROUTES,
  SITE_LAST_MODIFIED,
  SITE_OG_IMAGE_PATH,
} from "@/lib/marketing/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return SITE_INDEXABLE_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: SITE_LAST_MODIFIED,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    images: [absoluteUrl(SITE_OG_IMAGE_PATH)],
  }));
}
