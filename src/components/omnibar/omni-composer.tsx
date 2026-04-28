"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { ArrowLeftRight, Settings2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { BugReportButton } from "@/components/bug-report-button";
import { ModifierSwitches } from "@/components/omnibar/modifier-switches";
import { OmniTextarea } from "@/components/omnibar/omni-textarea";
import { PokemonSideSummary } from "@/components/omnibar/pokemon-side-summary";
import { QuickSuggestions } from "@/components/omnibar/quick-suggestions";
import { ResultsPanel } from "@/components/omnibar/results-panel";
import { HelpBubble } from "@/components/omnibar/help-bubble";
import { useI18n } from "@/i18n/I18nProvider";
import { formatIssue } from "@/i18n/messages";
import { parseShareState } from "@/lib/share/parse-share-state";
import { useOmniStore } from "@/store/use-omni-store";
import { useTeamStore } from "@/store/use-team-store";

function getWorkbenchSideLabel(
  segment: ReturnType<typeof useOmniStore.getState>["commandStructure"]["attacker"],
  fallback: string,
) {
  const label = segment.speciesText?.trim();
  return label || fallback;
}

export function OmniComposer() {
  const { dictionary } = useI18n();
  const [modifiersOpen, setModifiersOpen] = useState(false);
  const { issues, calculationReady, commandStructure, setInput, swapSides } = useOmniStore(
    useShallow((state) => ({
      issues: state.issues,
      calculationReady: state.calculationReady,
      commandStructure: state.commandStructure,
      setInput: state.setInput,
      swapSides: state.swapSides,
    })),
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const hasHydratedUrlPromptRef = useRef(false);
  const pendingHashTargetRef = useRef<string | null>(null);
  const issuesStatusId = useId();
  const resultsStatusId = useId();
  const modifiersSectionId = useId();
  const attackerLabel = getWorkbenchSideLabel(commandStructure.attacker, "attacker");
  const defenderLabel = getWorkbenchSideLabel(commandStructure.defender, "defender");
  const separatorLabel = commandStructure.separatorText ?? "x";
  const canSwapSides =
    commandStructure.lexed.hasDelimiter &&
    commandStructure.defender.speciesTokens.length > 0;

  const scrollToResults = () => {
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSwapSides = () => {
    if (!canSwapSides) {
      return;
    }

    swapSides();
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
    const hashTarget = window.location.hash.slice(1);
    const sharedSets = parseShareState(url.searchParams.get("state"));

    pendingHashTargetRef.current = hashTarget.startsWith("result-")
      ? hashTarget
      : null;

    if (sharedSets.length) {
      teamStore.setSharedSets(sharedSets);
    } else {
      teamStore.clearSharedSets();
    }

    if (prompt && !useOmniStore.getState().input.trim()) {
      setInput(prompt);
    }
  }, [setInput]);

  useEffect(() => {
    if (!calculationReady) {
      return;
    }

    const hashTarget = pendingHashTargetRef.current;
    if (!hashTarget) {
      return;
    }

    const target = document.getElementById(hashTarget);
    if (!target) {
      return;
    }

    pendingHashTargetRef.current = null;

    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [calculationReady]);

  return (
    <section className="mx-auto w-full min-w-0 max-w-7xl text-left">
      <div className="grid min-w-0 gap-4 xl:grid-cols-[310px_minmax(0,1fr)_310px] xl:items-start">
        <div className="order-2 min-w-0 xl:order-1">
          <PokemonSideSummary side="attacker" />
        </div>
        <div className="order-1 min-w-0 xl:order-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center">
              <BugReportButton />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <button
                type="button"
                aria-expanded={modifiersOpen}
                aria-controls={modifiersSectionId}
                aria-label={dictionary.home.toggleModifiers}
                onClick={() => setModifiersOpen((current) => !current)}
                className={`theme-toolbar-button gap-1 text-sm whitespace-nowrap ${
                  modifiersOpen
                    ? "theme-icon-button-active"
                    : "theme-icon-button"
                }`}
              >
                <Settings2 aria-hidden="true" size={14} strokeWidth={1.9} />
                <span>{dictionary.home.modifiers}</span>
              </button>
              <button
                type="button"
                aria-label={dictionary.home.swapSides}
                aria-keyshortcuts="Alt+X"
                onClick={handleSwapSides}
                className="theme-icon-button theme-icon-button-sm px-2.5 text-sm"
              >
                <ArrowLeftRight aria-hidden="true" size={14} strokeWidth={1.9} />
              </button>
              <HelpBubble />
            </div>
          </div>
          <div className="relative min-w-0">
            <div className="theme-composer min-w-0 rounded-xl">
              <div className="theme-composer-top relative">
                <div className="theme-workbench-strip flex items-center gap-2 px-4 py-2 md:px-5">
                  <div className="theme-workbench-segment flex min-w-0 flex-1 flex-col rounded-md px-3 py-1.5">
                    <span>{dictionary.modifierSwitches.attacker}</span>
                    <strong className="truncate">{attackerLabel}</strong>
                  </div>
                  <div className="theme-data-text rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1 text-[12px]">
                    {separatorLabel}
                  </div>
                  <div className="theme-workbench-segment flex min-w-0 flex-1 flex-col rounded-md px-3 py-1.5 text-right">
                    <span>{dictionary.modifierSwitches.defender}</span>
                    <strong className="truncate">{defenderLabel}</strong>
                  </div>
                </div>
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
                  {issues.length > 0
                    ? formatIssue(issues[0], dictionary)
                    : dictionary.home.noIssues}
                </div>
              </div>
              {modifiersOpen ? (
                <div
                  id={modifiersSectionId}
                  className="theme-composer-secondary"
                >
                  <ModifierSwitches />
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
            {calculationReady
              ? dictionary.home.resultsUpdated
              : dictionary.home.resultsNotReady}
          </div>
          {calculationReady ? (
            <div
              ref={resultsRef}
              className="mt-5"
              aria-describedby={resultsStatusId}
            >
              <ResultsPanel />
            </div>
          ) : null}
        </div>
        <div className="order-3 min-w-0 xl:order-3">
          <PokemonSideSummary side="defender" />
        </div>
      </div>
    </section>
  );
}
