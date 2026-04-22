import type { Metadata } from "next";
import { cookies } from "next/headers";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { DeferredVercelInsights } from "@/components/deferred-vercel-insights";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { I18nProvider } from "@/i18n/I18nProvider";
import { coerceLocale, DEFAULT_APP_LOCALE } from "@/i18n/locales";
import {
  LOCALE_COOKIE_KEY,
  THEME_COOKIE_KEY,
} from "@/lib/persistence/storage-keys";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://unburdenvgc.com"),
  title: "Unburden VGC | Fast damage calc for doubles",
  description:
    "Fast VGC damage calculation in a chat-like composer for testing matchups, bulk ranges, and competitive assumptions in seconds.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Unburden VGC | Fast damage calc for doubles",
    description:
      "Fast VGC damage calculation in a chat-like composer for testing matchups, bulk ranges, and competitive assumptions in seconds.",
    url: "https://unburdenvgc.com",
    siteName: "Unburden VGC",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Unburden VGC social share image",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Unburden VGC | Fast damage calc for doubles",
    description:
      "Fast VGC damage calculation in a chat-like composer for testing matchups, bulk ranges, and competitive assumptions in seconds.",
    images: [
      {
        url: "/twitter-image",
        alt: "Unburden VGC social share image",
      },
    ],
  },
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

  return (
    <html
      lang={initialLocale}
      data-theme={initialTheme}
      className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} h-full antialiased`}
      style={{ colorScheme: initialTheme }}
    >
      <body
        suppressHydrationWarning
        data-theme={initialTheme}
        className="min-h-full flex flex-col"
      >
        <ThemeProvider initialTheme={initialTheme}>
          <I18nProvider initialLocale={initialLocale}>{children}</I18nProvider>
        </ThemeProvider>
        <DeferredVercelInsights />
      </body>
    </html>
  );
}
