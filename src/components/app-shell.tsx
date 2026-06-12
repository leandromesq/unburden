"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { AppLogoMark } from "@/components/app-logo-mark";
import { LocaleToggle } from "@/components/locale-toggle";
import { RegulationBadge } from "@/components/regulation-badge";
import { TesterLinks } from "@/components/tester-links";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useI18n } from "@/i18n/I18nProvider";

interface AppShellProps {
  activeTool: "damage" | "speed";
  children: ReactNode;
}

export function AppShell({ activeTool, children }: AppShellProps) {
  const { dictionary } = useI18n();
  const tabs = [
    { id: "damage", href: "/", label: dictionary.home.damage },
    { id: "speed", href: "/speed", label: dictionary.home.speed },
  ] as const;

  return (
    <main className="theme-page">
      <div className="mx-auto flex min-h-screen w-full max-w-[1360px] flex-col px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <header className="border-b theme-divider pb-3">
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <AppLogoMark />
                <h1 className="text-xl font-semibold tracking-[-0.03em] sm:text-2xl">
                  Unburden VGC
                </h1>
                <RegulationBadge />
              </div>
              <nav className="flex flex-wrap gap-1.5" aria-label="Calculator tools">
                {tabs.map((tab) => (
                  <Link
                    key={tab.id}
                    href={tab.href}
                    aria-current={activeTool === tab.id ? "page" : undefined}
                    className={`theme-tool-tab rounded-md px-3 py-1.5 text-sm ${
                      activeTool === tab.id ? "theme-tool-tab-active" : ""
                    }`}
                  >
                    {tab.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
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
          <p className="theme-text-faint mt-2 hidden max-w-3xl text-sm leading-5 md:block">
            {dictionary.home.heroDescription}
          </p>
        </header>

        <section id="calculator" className="flex-1 py-4 sm:py-5">
          {children}
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
