"use client";

import { useRef } from "react";

import { ModifierSwitches } from "@/components/omnibar/modifier-switches";
import { OmniTextarea } from "@/components/omnibar/omni-textarea";
import { QuickSuggestions } from "@/components/omnibar/quick-suggestions";
import { ResultsPanel } from "@/components/omnibar/results-panel";
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
    <section className="mx-auto w-full max-w-5xl text-left">
      <div className="theme-composer rounded-[32px]">
        <OmniTextarea textareaRef={textareaRef} onSubmitReady={scrollToResults} />
        <QuickSuggestions textareaRef={textareaRef} />
        <ModifierSwitches textareaRef={textareaRef} />
        {issues.length > 0 ? (
          <div className="theme-divider theme-text-dim border-t px-5 py-3 text-sm">
            {issues[0]}
          </div>
        ) : null}
      </div>
      {calculationReady ? (
        <div ref={resultsRef} className="mt-5">
          <ResultsPanel />
        </div>
      ) : null}
    </section>
  );
}
