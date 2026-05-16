"use client";

import { AppShell } from "@/components/app-shell";
import { OmniComposer } from "@/components/omnibar/omni-composer";

export default function Home() {
  return (
    <AppShell activeTool="damage">
      <OmniComposer />
    </AppShell>
  );
}
