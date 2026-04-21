import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { DeferredVercelInsights } from "@/components/deferred-vercel-insights";
import { I18nProvider } from "@/i18n/I18nProvider";
import { DEFAULT_APP_LOCALE } from "@/i18n/locales";
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
      data-theme="dark"
      className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        data-theme="dark"
        className="min-h-full flex flex-col"
      >
        <I18nProvider initialLocale={DEFAULT_APP_LOCALE}>{children}</I18nProvider>
        <DeferredVercelInsights />
      </body>
    </html>
  );
}
