export const SITE_URL = "https://unburdenvgc.com";
export const SITE_NAME = "Unburden VGC";
export const SITE_SHORT_NAME = "Unburden";
export const SITE_TITLE = "Unburden VGC | Pokemon VGC Damage Calculator";
export const SITE_DESCRIPTION =
  "Fast Pokemon VGC damage calculator for doubles. Test matchups, Champions SP spreads, saved sets, spread moves, and bulk ranges in seconds.";
export const SITE_ABOUT_TITLE = `About ${SITE_NAME} | Pokemon VGC Calculator`;
export const SITE_ABOUT_DESCRIPTION =
  "Learn how Unburden VGC speeds up Pokemon Champions teambuilding with prompt-first damage calculation, saved sets, and doubles-focused matchup tools.";
export const SITE_SHARE_IMAGE_SUBTITLE =
  "Fast Pokemon VGC damage calculation for testing doubles matchups, Champions SP spreads, saved sets, and bulk ranges.";
export const SITE_SHARE_IMAGE_ALT =
  "Unburden VGC share image with a tactical grid background, the app name, and a subtitle about fast Pokemon VGC damage calculation.";
export const SITE_AUTHOR_NAME = "Leandro Mesquita";
export const SITE_X_HANDLE = "@lelezonio";
const SITE_X_URL = "https://x.com/lelezonio";
export const SITE_OG_IMAGE_PATH = "/opengraph-image";
export const SITE_TWITTER_IMAGE_PATH = "/twitter-image";
export const SITE_LAST_MODIFIED = "2026-04-28";
const SITE_LOCALES = ["en", "pt-BR"] as const;
export const SITE_THEME_COLOR_DARK = "#060608";
export const SITE_THEME_COLOR_LIGHT = "#edf4fb";
export const SITE_KEYWORDS = [
  "VGC damage calculator",
  "Pokemon VGC damage calc",
  "Pokemon VGC calculator",
  "Pokemon damage calculator",
  "Pokemon Champions calculator",
  "Pokemon Champions damage calculator",
  "competitive Pokemon damage calculator",
  "VGC doubles damage calculator",
  "doubles matchup tester",
  "bulk range calculator",
  "VGC team testing",
  "Pokemon doubles calculator",
] as const;

export const SITE_INDEXABLE_ROUTES = [
  {
    path: "/",
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    path: "/about",
    changeFrequency: "monthly",
    priority: 0.6,
  },
] as const;

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export function getSeoStructuredData() {
  const creator = {
    "@type": "Person",
    "@id": absoluteUrl("/#creator"),
    name: SITE_AUTHOR_NAME,
    sameAs: [SITE_X_URL],
  };

  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": absoluteUrl("/#website"),
      url: SITE_URL,
      name: SITE_NAME,
      alternateName: SITE_SHORT_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: [...SITE_LOCALES],
      image: absoluteUrl(SITE_OG_IMAGE_PATH),
      publisher: creator,
      creator,
      about: [
        { "@type": "Thing", name: "Pokemon VGC damage calculation" },
        { "@type": "Thing", name: "Pokemon Champions teambuilding" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "@id": absoluteUrl("/#app"),
      name: SITE_NAME,
      alternateName: SITE_SHORT_NAME,
      applicationCategory: "UtilitiesApplication",
      applicationSubCategory: "Pokemon VGC damage calculator",
      operatingSystem: "Web Browser",
      browserRequirements: "Requires JavaScript and a modern web browser.",
      description: SITE_DESCRIPTION,
      url: SITE_URL,
      image: absoluteUrl(SITE_OG_IMAGE_PATH),
      screenshot: absoluteUrl(SITE_OG_IMAGE_PATH),
      inLanguage: [...SITE_LOCALES],
      keywords: SITE_KEYWORDS.join(", "),
      featureList: [
        "Chat-style VGC damage prompt composer",
        "Fast attacker and defender matchup testing",
        "Bulk range comparison for min, mid, and max rolls",
        "English and Brazilian Portuguese interface",
      ],
      audience: {
        "@type": "Audience",
        audienceType: "Competitive Pokemon players and teambuilders",
      },
      isAccessibleForFree: true,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      author: creator,
      creator,
      publisher: creator,
    },
  ];
}

export function getAboutStructuredData() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "@id": absoluteUrl("/about#webpage"),
      url: absoluteUrl("/about"),
      name: SITE_ABOUT_TITLE,
      description: SITE_ABOUT_DESCRIPTION,
      inLanguage: [...SITE_LOCALES],
      isPartOf: { "@id": absoluteUrl("/#website") },
      about: { "@id": absoluteUrl("/#app") },
      breadcrumb: { "@id": absoluteUrl("/about#breadcrumb") },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "@id": absoluteUrl("/about#breadcrumb"),
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Calculator",
          item: SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "About",
          item: absoluteUrl("/about"),
        },
      ],
    },
  ];
}

export function serializeJsonLd(payload: unknown) {
  return JSON.stringify(payload).replace(/</g, "\\u003c");
}
