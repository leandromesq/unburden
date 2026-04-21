import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { DeferredVercelInsights } from "@/components/deferred-vercel-insights";
import { I18nProvider } from "@/i18n/I18nProvider";
import {
  APP_LOCALES,
  DEFAULT_APP_LOCALE,
  LOCALE_STORAGE_KEY,
} from "@/i18n/locales";
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
  title: "Omniboost",
  description: "Calculo de dano VGC em alta velocidade com um composer estilo chat.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={DEFAULT_APP_LOCALE}
      suppressHydrationWarning
      data-theme="dark"
      className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                try {
                  const stored = window.localStorage.getItem("omniboost-theme");
                  const theme = stored === "light" || stored === "dark" ? stored : "dark";
                  const storedLocale = window.localStorage.getItem("${LOCALE_STORAGE_KEY}");
                  const supportedLocales = ${JSON.stringify(APP_LOCALES)};
                  const locale = supportedLocales.includes(storedLocale) ? storedLocale : "${DEFAULT_APP_LOCALE}";
                  document.documentElement.dataset.theme = theme;
                  document.documentElement.style.colorScheme = theme;
                  document.documentElement.lang = locale;
                  document.body.dataset.theme = theme;
                } catch {
                  document.documentElement.dataset.theme = "dark";
                  document.documentElement.style.colorScheme = "dark";
                  document.documentElement.lang = "${DEFAULT_APP_LOCALE}";
                  document.body.dataset.theme = "dark";
                }
              })();
            `,
          }}
        />
        <I18nProvider initialLocale={DEFAULT_APP_LOCALE}>{children}</I18nProvider>
        <DeferredVercelInsights />
      </body>
    </html>
  );
}
