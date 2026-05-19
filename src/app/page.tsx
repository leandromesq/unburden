"use client";

import { AppShell } from "@/components/app-shell";
import { OmniComposer } from "@/components/omnibar/omni-composer";
import { useI18n } from "@/i18n/I18nProvider";

export default function Home() {
  const { dictionary } = useI18n();
  return (
    <AppShell activeTool="damage">
      <h2 className="sr-only">{dictionary.home.kicker}</h2>
      <OmniComposer />
    </AppShell>
  );
}
