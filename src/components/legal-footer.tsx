"use client";

import { useI18n } from "@/i18n/I18nProvider";

export function LegalFooter() {
  const { dictionary } = useI18n();
  const legal = dictionary.legalFooter;

  return (
    <footer className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-10 md:pb-14">
      <section
        aria-labelledby="legal-title"
        className="theme-panel overflow-hidden rounded-[1.6rem] px-5 py-5 text-left md:px-6 md:py-6"
      >
        <div className="grid gap-5 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-start">
          <div>
            <div className="theme-text-faint text-[10px] font-semibold uppercase tracking-[0.24em]">
              {legal.eyebrow}
            </div>
            <h2
              id="legal-title"
              className="mt-3 text-xl leading-tight tracking-[-0.03em] md:text-2xl"
            >
              {legal.title}
            </h2>
            <p className="theme-text-muted mt-3 text-sm leading-7">
              {legal.copyright}
            </p>
          </div>

          <div className="space-y-3 text-sm leading-7">
            <p
              className="theme-text-dim border-l pl-3"
              style={{ borderColor: "var(--accent-border)" }}
            >
              {legal.proprietary}
            </p>
            <p
              className="theme-text-dim border-l pl-3"
              style={{ borderColor: "var(--accent-border)" }}
            >
              {legal.thirdParty}
            </p>
          </div>
        </div>
      </section>
    </footer>
  );
}
