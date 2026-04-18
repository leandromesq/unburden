"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { useShallow } from "zustand/react/shallow";

import { BugReportButton } from "@/components/bug-report-button";
import { ModifierSwitches } from "@/components/omnibar/modifier-switches";
import { OmniTextarea } from "@/components/omnibar/omni-textarea";
import { PokemonSideSummary } from "@/components/omnibar/pokemon-side-summary";
import { QuickSuggestions } from "@/components/omnibar/quick-suggestions";
import { ResultsPanel } from "@/components/omnibar/results-panel";
import { HelpBubble } from "@/components/omnibar/help-bubble";
import { StrictModeToggle } from "@/components/omnibar/strict-mode-toggle";
import { parseShareState } from "@/lib/share/parse-share-state";
import { useOmniStore } from "@/store/use-omni-store";
import { useTeamStore } from "@/store/use-team-store";

function subscribeToHydration() {
  return () => {};
}

function getClientHydrationSnapshot() {
  return true;
}

function getServerHydrationSnapshot() {
  return false;
}

export function OmniComposer() {
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const [modifiersOpen, setModifiersOpen] = useState(false);
  const { issues, calculationReady, setInput, setStrictMode } = useOmniStore(
    useShallow((state) => ({
      issues: state.issues,
      calculationReady: state.calculationReady,
      setInput: state.setInput,
      setStrictMode: state.setStrictMode,
    })),
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const hasHydratedUrlPromptRef = useRef(false);
  const issuesStatusId = useId();
  const resultsStatusId = useId();
  const modifiersSectionId = useId();

  const scrollToResults = () => {
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (hasHydratedUrlPromptRef.current || typeof window === "undefined") {
      return;
    }

    hasHydratedUrlPromptRef.current = true;

    const teamStore = useTeamStore.getState();
    teamStore.hydrate();

    const url = new URL(window.location.href);
    const prompt = url.searchParams.get("prompt");
    const sharedSets = parseShareState(url.searchParams.get("state"));
    setStrictMode(url.searchParams.get("strict") === "1");

    if (sharedSets.length) {
      teamStore.setSharedSets(sharedSets);
    } else {
      teamStore.clearSharedSets();
    }

    if (prompt && !useOmniStore.getState().input.trim()) {
      setInput(prompt);
    }
  }, [setInput, setStrictMode]);

  useEffect(() => {
    if (
      !calculationReady ||
      typeof window === "undefined" ||
      !window.location.hash
    ) {
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
      <div className="grid gap-4 xl:grid-cols-[310px_minmax(0,1fr)_310px] xl:items-start">
        <div className="order-2 xl:order-1">
          <PokemonSideSummary side="attacker" />
        </div>
        <div className="order-1 xl:order-2">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center">
              <BugReportButton />
            </div>
            <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              aria-expanded={modifiersOpen}
              aria-controls={modifiersSectionId}
              aria-label="Toggle modifiers panel"
              onClick={() => setModifiersOpen((current) => !current)}
              className={`flex h-8 items-center justify-center rounded-full px-3 text-sm font-medium transition-all ${
                modifiersOpen ? "theme-icon-button-active" : "theme-icon-button"
              }`}
            >
              Modifiers
            </button>
            <StrictModeToggle />
            <HelpBubble />
            </div>
          </div>
          <div className="relative">
            <div className="theme-composer rounded-4xl">
              <div className="theme-composer-top relative">
                <OmniTextarea
                  textareaRef={textareaRef}
                  onSubmitReady={scrollToResults}
                />
                <QuickSuggestions textareaRef={textareaRef} />
                <div
                  id={issuesStatusId}
                  className="theme-status px-5 py-3 text-sm"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {issues.length > 0 ? issues[0] : "No issues."}
                </div>
              </div>
              {modifiersOpen ? (
                <div
                  id={modifiersSectionId}
                  className="theme-composer-secondary"
                >
                  {isHydrated ? <ModifierSwitches /> : null}
                </div>
              ) : null}
            </div>
          </div>
          <div
            id={resultsStatusId}
            className="sr-only"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {calculationReady ? "Results updated." : "Results not ready yet."}
          </div>
          {calculationReady ? (
            <div
              ref={resultsRef}
              className="mt-7"
              aria-describedby={resultsStatusId}
            >
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
