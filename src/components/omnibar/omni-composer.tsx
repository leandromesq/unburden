"use client";

import { useEffect, useRef } from "react";

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
  const input = useOmniStore((state) => state.input);
  const setInput = useOmniStore((state) => state.setInput);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const hasHydratedUrlPromptRef = useRef(false);

  const scrollToResults = () => {
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (hasHydratedUrlPromptRef.current || typeof window === "undefined") {
      return;
    }

    hasHydratedUrlPromptRef.current = true;

    const url = new URL(window.location.href);
    const prompt = url.searchParams.get("prompt");

    if (prompt && !input.trim()) {
      setInput(prompt);
    }
  }, [input, setInput]);

  useEffect(() => {
    if (!calculationReady || typeof window === "undefined" || !window.location.hash) {
      return;
    }

    const target = document.getElementById(window.location.hash.slice(1));
    if (!target) {
      return;
    }

    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [calculationReady]);

  return (
    <section className="mx-auto w-full max-w-7xl text-left">
      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_280px] xl:items-start">
        <div className="order-2 xl:order-1">
          <PokemonSideSummary side="attacker" />
        </div>
        <div className="order-1 xl:order-2">
          <div className="relative">
            <div className="theme-composer rounded-4xl">
              <div className="theme-composer-top relative">
                <div className="pointer-events-auto absolute right-3 top-3 z-30">
                  <HelpBubble />
                </div>
                <OmniTextarea
                  textareaRef={textareaRef}
                  onSubmitReady={scrollToResults}
                />
                <QuickSuggestions textareaRef={textareaRef} />
                {issues.length > 0 ? (
                  <div className="theme-status px-5 py-3 text-sm">
                    {issues[0]}
                  </div>
                ) : null}
              </div>
              <div className="theme-composer-secondary">
                <ModifierSwitches />
              </div>
            </div>
          </div>
          {calculationReady ? (
            <div ref={resultsRef} className="mt-7">
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
