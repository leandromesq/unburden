export const SITE_URL = "https://unburdenvgc.com";
export const SITE_NAME = "Unburden VGC";
export const SITE_SHORT_NAME = "Unburden";
export const SITE_TITLE = "Unburden VGC | Fast damage calc for doubles";
export const SITE_DESCRIPTION =
  "Fast VGC damage calculation in a chat-like composer for testing matchups, bulk ranges, and competitive assumptions in seconds.";
export const SITE_SHARE_IMAGE_SUBTITLE =
  "Fast VGC damage calculation in a chat-like composer for testing matchups, bulk ranges, and competitive assumptions.";
export const SITE_SHARE_IMAGE_ALT =
  "Unburden VGC share image with a dark tactical grid background, the app name, and a short subtitle about fast VGC damage calculation.";
export const SITE_AUTHOR_NAME = "Leandro Mesquita";
export const SITE_X_HANDLE = "@lelezonio";
const SITE_X_URL = "https://x.com/lelezonio";
export const SITE_OG_IMAGE_PATH = "/opengraph-image";
export const SITE_TWITTER_IMAGE_PATH = "/twitter-image";
const SITE_LOCALES = ["en", "pt-BR"] as const;
export const SITE_THEME_COLOR_DARK = "#060608";
export const SITE_THEME_COLOR_LIGHT = "#edf4fb";
export const SITE_KEYWORDS = [
  "VGC damage calculator",
  "Pokemon VGC damage calc",
  "Pokemon Champions calculator",
  "competitive Pokemon damage calculator",
  "doubles matchup tester",
  "bulk range calculator",
  "VGC team testing",
  "Pokemon doubles calculator",
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
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "@id": absoluteUrl("/#app"),
      name: SITE_NAME,
      alternateName: SITE_SHORT_NAME,
      applicationCategory: "UtilitiesApplication",
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

export function serializeJsonLd(payload: unknown) {
  return JSON.stringify(payload).replace(/</g, "\\u003c");
}
