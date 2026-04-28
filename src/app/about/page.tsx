import type { Metadata } from "next";

import {
  absoluteUrl,
  getAboutStructuredData,
  serializeJsonLd,
  SITE_ABOUT_DESCRIPTION,
  SITE_ABOUT_TITLE,
  SITE_NAME,
  SITE_OG_IMAGE_URL,
  SITE_SHARE_IMAGE_ALT,
  SITE_TWITTER_IMAGE_URL,
} from "@/lib/marketing/seo";
import { AboutPage } from "./page-client";

export const metadata: Metadata = {
  title: SITE_ABOUT_TITLE,
  description: SITE_ABOUT_DESCRIPTION,
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: SITE_ABOUT_TITLE,
    description: SITE_ABOUT_DESCRIPTION,
    url: absoluteUrl("/about"),
    siteName: SITE_NAME,
    type: "website",
    images: [
      {
        url: absoluteUrl(SITE_OG_IMAGE_URL),
        width: 1200,
        height: 630,
        alt: SITE_SHARE_IMAGE_ALT,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_ABOUT_TITLE,
    description: SITE_ABOUT_DESCRIPTION,
    images: [
      {
        url: absoluteUrl(SITE_TWITTER_IMAGE_URL),
        alt: SITE_SHARE_IMAGE_ALT,
      },
    ],
  },
};

export default function AboutRoute() {
  const jsonLd = serializeJsonLd(getAboutStructuredData());

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <AboutPage />
    </>
  );
}
