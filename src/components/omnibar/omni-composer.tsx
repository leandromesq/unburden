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

  return (
    <section className="mx-auto w-full max-w-5xl text-left">
      <div className="overflow-hidden rounded-[32px] border border-zinc-800 bg-[linear-gradient(180deg,rgba(18,20,28,0.98),rgba(10,12,18,0.98))] shadow-[0_24px_100px_rgba(0,0,0,0.42)]">
        <OmniTextarea textareaRef={textareaRef} />
        <QuickSuggestions textareaRef={textareaRef} />
        <ModifierSwitches textareaRef={textareaRef} />
        {issues.length > 0 ? (
          <div className="border-t border-zinc-800/80 px-5 py-3 text-sm text-zinc-500">
            {issues[0]}
          </div>
        ) : null}
      </div>
      {calculationReady ? (
        <div className="mt-5">
          <ResultsPanel />
        </div>
      ) : null}
    </section>
  );
}
