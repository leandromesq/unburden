"use client";

import Link from "next/link";

import { AppLogoMark } from "@/components/app-logo-mark";
import { LocaleToggle } from "@/components/locale-toggle";
import { OmniComposer } from "@/components/omnibar/omni-composer";
import { RegulationBadge } from "@/components/regulation-badge";
import { TesterLinks } from "@/components/tester-links";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useI18n } from "@/i18n/I18nProvider";

export default function Home() {
  const { dictionary } = useI18n();

  return (
    <main className="theme-page">
      <div className="mx-auto flex min-h-screen w-full max-w-[1360px] flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <header className="border-b theme-divider pb-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-[-0.03em]">
                  Unburden
                </h1>
                <RegulationBadge />
              </div>
              <p className="theme-text-dim mt-2 max-w-2xl text-sm leading-6">
                {dictionary.home.heroDescription}
              </p>
            </div>

            <div className="flex justify-center">
              <AppLogoMark />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <TesterLinks className="text-sm" />
              <Link
                href="/about"
                className="theme-icon-button inline-flex h-8 items-center rounded-lg px-3 text-sm"
              >
                {dictionary.home.about}
              </Link>
              <LocaleToggle />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <section id="calculator" className="flex-1 py-5 sm:py-6">
          <OmniComposer />
        </section>

        <footer className="border-t theme-divider pt-4">
          <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="theme-text-faint">
              {dictionary.legalFooter.copyright}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/about"
                className="theme-text-dim underline underline-offset-4"
              >
                {dictionary.home.about}
              </Link>
              <span className="theme-text-faint" aria-hidden="true">
                ·
              </span>
              <span className="theme-text-dim">
                {dictionary.legalFooter.title}
              </span>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
