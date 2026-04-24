import type { Metadata } from "next";

import { SITE_NAME } from "@/lib/marketing/seo";
import { AboutPage } from "./page-client";

export const metadata: Metadata = {
  title: `About | ${SITE_NAME}`,
  description: `Project, support, and legal information for ${SITE_NAME}.`,
};

export default function AboutRoute() {
  return <AboutPage />;
}
