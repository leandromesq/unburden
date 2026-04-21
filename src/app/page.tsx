"use client";

import { AboutSection } from "@/components/about-section";
import { LegalFooter } from "@/components/legal-footer";
import { LocaleToggle } from "@/components/locale-toggle";
import { OmniComposer } from "@/components/omnibar/omni-composer";
import { TesterLinks } from "@/components/tester-links";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { RegulationBadge } from "@/components/regulation-badge";
import { useI18n } from "@/i18n/I18nProvider";

export default function Home() {
  const { dictionary } = useI18n();

  return (
    <main className="theme-page relative min-h-screen overflow-hidden">
      <div className="theme-page-grid" />
      <section className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-start px-6 py-16 text-center">
        <div className="mb-5 flex flex-wrap items-center justify-center gap-2 md:gap-3">
          <div className="theme-kicker rounded-full px-4 py-1 text-xs uppercase tracking-[0.35em]">
            {dictionary.home.kicker}
          </div>
          <RegulationBadge />
          <a
            href="#about"
            className="theme-icon-button inline-flex h-8 items-center rounded-full px-3.5 text-xs font-medium uppercase tracking-[0.16em]"
          >
            {dictionary.home.about}
          </a>
          <LocaleToggle />
          <ThemeToggle />
        </div>
        <h1 className="max-w-4xl font-sans text-5xl leading-none tracking-[-0.05em] md:text-7xl">
          Omniboost
        </h1>
        <p className="theme-text-muted mt-4 max-w-2xl text-base leading-7 md:text-lg">
          {dictionary.home.heroDescription}
        </p>
        <TesterLinks />
        <div className="mt-8 w-full">
          <OmniComposer />
        </div>
      </section>
      <AboutSection />
      <LegalFooter />
    </main>
  );
}
