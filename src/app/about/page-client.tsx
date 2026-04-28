"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AboutSection } from "@/components/about-section";
import { AppLogoMark } from "@/components/app-logo-mark";
import { LegalFooter } from "@/components/legal-footer";
import { LocaleToggle } from "@/components/locale-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useI18n } from "@/i18n/I18nProvider";

export function AboutPage() {
  const { dictionary } = useI18n();

  return (
    <main className="theme-page">
      <div className="mx-auto flex min-h-screen w-full max-w-[1040px] flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <header className="border-b theme-divider pb-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href="/"
                  aria-label="Back to calculator"
                  className="theme-icon-button theme-icon-button-sm"
                >
                  <ArrowLeft aria-hidden="true" size={15} strokeWidth={2} />
                </Link>
                <Link
                  href="/"
                  className="theme-text-dim text-sm underline underline-offset-4"
                >
                  Unburden
                </Link>
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                {dictionary.home.about}
              </h1>
            </div>
            <div className="flex justify-center">
              <AppLogoMark />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <LocaleToggle />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <div className="flex-1 py-6">
          <AboutSection />
          <LegalFooter />
        </div>
      </div>
    </main>
  );
}
