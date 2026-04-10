"use client";

import { useRef } from "react";

import { ModifierSwitches } from "@/components/omnibar/modifier-switches";
import { OmniTextarea } from "@/components/omnibar/omni-textarea";
import { PokemonSideSummary } from "@/components/omnibar/pokemon-side-summary";
import { QuickSuggestions } from "@/components/omnibar/quick-suggestions";
import { ResultsPanel } from "@/components/omnibar/results-panel";
import { HelpBubble } from "@/components/omnibar/help-bubble";
import { useOmniStore } from "@/store/use-omni-store";

export function OmniComposer() {
  const issues = useOmniStore((state) => state.issues);
  const calculationReady = useOmniStore((state) => state.calculationReady);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const scrollToResults = () => {
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="mx-auto w-full max-w-7xl text-left">
      <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_240px] xl:items-start">
        <div className="order-2 xl:order-1">
          <PokemonSideSummary side="attacker" />
        </div>
        <div className="order-1 xl:order-2">
          <div className="relative">
            <div className="theme-composer rounded-[32px]">
              <OmniTextarea
                textareaRef={textareaRef}
                onSubmitReady={scrollToResults}
              />
              <QuickSuggestions textareaRef={textareaRef} />
              <ModifierSwitches textareaRef={textareaRef} />
              {issues.length > 0 ? (
                <div className="theme-divider theme-text-dim border-t px-5 py-3 text-sm">
                  {issues[0]}
                </div>
              ) : null}
            </div>
            <div className="absolute right-3 top-3 z-10">
              <HelpBubble />
            </div>
          </div>
          {calculationReady ? (
            <div ref={resultsRef} className="mt-5">
              <ResultsPanel />
            </div>
          ) : null}
        </div>
        <div className="order-3 xl:order-3">
          <PokemonSideSummary side="defender" />
        </div>
      </div>
    </section>
  );
}
