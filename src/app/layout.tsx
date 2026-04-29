import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { DeferredVercelInsights } from "@/components/deferred-vercel-insights";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { I18nProvider } from "@/i18n/I18nProvider";
import { coerceLocale, DEFAULT_APP_LOCALE } from "@/i18n/locales";
import {
  absoluteUrl,
  getSeoStructuredData,
  serializeJsonLd,
  SITE_AUTHOR_NAME,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_OG_IMAGE_URL,
  SITE_SHARE_IMAGE_ALT,
  SITE_THEME_COLOR_DARK,
  SITE_THEME_COLOR_LIGHT,
  SITE_TITLE,
  SITE_TWITTER_IMAGE_URL,
  SITE_URL,
  SITE_X_HANDLE,
} from "@/lib/marketing/seo";
import {
  LOCALE_COOKIE_KEY,
  THEME_COOKIE_KEY,
} from "@/lib/persistence/storage-keys";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  referrer: "origin-when-cross-origin",
  authors: [{ name: SITE_AUTHOR_NAME, url: SITE_URL }],
  creator: SITE_AUTHOR_NAME,
  publisher: SITE_AUTHOR_NAME,
  category: "gaming utilities",
  keywords: [...SITE_KEYWORDS],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
    shortcut: ["/favicon.ico"],
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "en_US",
    alternateLocale: ["pt_BR"],
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
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    creator: SITE_X_HANDLE,
    images: [absoluteUrl(SITE_TWITTER_IMAGE_URL)],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: SITE_THEME_COLOR_DARK },
    { media: "(prefers-color-scheme: light)", color: SITE_THEME_COLOR_LIGHT },
  ],
  colorScheme: "dark light",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialTheme =
    cookieStore.get(THEME_COOKIE_KEY)?.value === "light" ? "light" : "dark";
  const initialLocale = coerceLocale(
    cookieStore.get(LOCALE_COOKIE_KEY)?.value ?? DEFAULT_APP_LOCALE,
  );
  const jsonLd = serializeJsonLd(getSeoStructuredData());

  return (
    <html
      lang={initialLocale}
      data-theme={initialTheme}
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
      style={{ colorScheme: initialTheme }}
    >
      <body
        suppressHydrationWarning
        data-theme={initialTheme}
        className="min-h-full flex flex-col"
      >
        <a href="#calculator" className="theme-skip-link">
          Skip to calculator
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
        <ThemeProvider initialTheme={initialTheme}>
          <I18nProvider initialLocale={initialLocale}>{children}</I18nProvider>
        </ThemeProvider>
        <DeferredVercelInsights />
      </body>
    </html>
  );
}
