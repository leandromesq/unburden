"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AboutSection } from "@/components/about-section";

import { LegalFooter } from "@/components/legal-footer";
import { LocaleToggle } from "@/components/locale-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useI18n } from "@/i18n/I18nProvider";

export function AboutPage() {
  const { dictionary } = useI18n();

  return (
    <main className="theme-page">
      <div className="mx-auto flex min-h-screen w-full max-w-[1040px] flex-col px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <header className="border-b theme-divider pb-3">
          <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
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
              <h1 className="text-xl font-semibold tracking-[-0.03em] sm:text-2xl">
                {dictionary.home.about}
              </h1>
            </div>
            <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
              <LocaleToggle />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <div className="flex-1 py-4 sm:py-5">
          <AboutSection />
          <LegalFooter />
        </div>
      </div>
    </main>
  );
}
