"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { EMPTY_STAT_SPREAD } from "@/lib/calc/stat-calc";
import { pokemonById } from "@/lib/data/loaders";
import { analyzeCommandStructure } from "@/lib/parser/command-structure";
import {
  rebuildInputWithSpecies,
  rebuildInputWithStatPoints,
  type SummarySide,
} from "@/lib/parser/input-mutations";
import {
  applyMarkerToState,
  buildNatureMarkerState,
  parseStatInputDraft,
  resolveNatureFromMarkerState,
} from "@/lib/team/nature-markers";
import { createImportedSet } from "@/lib/team/imported-set-utils";
import { getCanonicalSetReferenceToken } from "@/lib/team/set-references";
import { useOmniStore } from "@/store/use-omni-store";
import { useTeamStore } from "@/store/use-team-store";
import { ImportSetModal } from "@/components/omnibar/import-set-modal";
import { PokemonSetEditorModal } from "@/components/omnibar/pokemon-set-editor-modal";
import { SummaryEmptyState } from "@/components/omnibar/pokemon-summary/summary-empty-state";
import { SummaryHeader } from "@/components/omnibar/pokemon-summary/summary-header";
import { SummaryIdentityCard } from "@/components/omnibar/pokemon-summary/summary-identity-card";
import { SummaryMoves } from "@/components/omnibar/pokemon-summary/summary-moves";
import { SummarySetActions } from "@/components/omnibar/pokemon-summary/summary-set-actions";
import { SummarySpSpread } from "@/components/omnibar/pokemon-summary/summary-sp-spread";
import { SummaryStatsGrid } from "@/components/omnibar/pokemon-summary/summary-stats-grid";
import {
  getNatureEffect,
  SUMMARY_STAT_LABELS,
} from "@/components/omnibar/pokemon-summary/shared";
import { usePokemonSummary } from "@/components/omnibar/use-pokemon-summary";
import type { ImportedSet, PokemonEntry, StatSpread } from "@/lib/types";

type StatKey = keyof StatSpread;
const STAT_LABELS: Array<[StatKey, string]> = SUMMARY_STAT_LABELS;

export function PokemonSideSummary({ side }: { side: SummarySide }) {
  const {
    commandStructure,
    parsedCommand,
    setAttackerMove,
    setInput,
    recompute,
  } = useOmniStore(
    useShallow((state) => ({
      commandStructure: state.commandStructure,
      parsedCommand: state.parsed,
      setAttackerMove: state.setAttackerMove,
      setInput: state.setInput,
      recompute: state.recompute,
    })),
  );
  const { importedSets, removeSet, saveSet } = useTeamStore(
    useShallow((state) => ({
      importedSets: state.importedSets,
      removeSet: state.removeSet,
      saveSet: state.saveSet,
    })),
  );
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [pendingStatPoints, setPendingStatPoints] = useState<StatSpread | null>(
    null,
  );
  const [natureMarkers, setNatureMarkers] = useState(
    buildNatureMarkerState("Hardy"),
  );

  const switchRef = useRef<HTMLDivElement>(null);

  const handleSwitchPointerDown = useEffectEvent((e: MouseEvent) => {
    if (switchRef.current && !switchRef.current.contains(e.target as Node)) {
      setSwitchOpen(false);
    }
  });

  // Close the switch dropdown when clicking outside it
  useEffect(() => {
    if (!switchOpen) return;
    document.addEventListener("mousedown", handleSwitchPointerDown);
    return () =>
      document.removeEventListener("mousedown", handleSwitchPointerDown);
  }, [switchOpen]);

  const handleSelectSet = (nextSet: ImportedSet) => {
    const input = useOmniStore.getState().input;
    const structure = analyzeCommandStructure(input);
    const globalTokens = structure.globalTokens.map((token) => token.raw);
    const referenceToken = getCanonicalSetReferenceToken(nextSet);
    if (side === "attacker") {
      const defenderPart = structure.lexed.hasDelimiter
        ? " x " +
          [
            ...structure.defender.rawTokens.map((t) => t.raw),
            ...globalTokens,
          ].join(" ")
        : "";
      setInput((referenceToken + defenderPart).trim());
    } else {
      const attackerPart = structure.attacker.rawTokens
        .map((t) => t.raw)
        .join(" ")
        .trim();
      if (attackerPart) {
        setInput(
          [attackerPart, "x", referenceToken, ...globalTokens]
            .filter(Boolean)
            .join(" ")
            .trim(),
        );
      } else {
        setInput(referenceToken);
      }
    }
  };

  const handleRemoveSet = (speciesId: string) => {
    removeSet(speciesId);
    recompute();
  };

  const handleSwitchToMegaForm = (targetPokemon: PokemonEntry) => {
    const input = useOmniStore.getState().input;
    setInput(rebuildInputWithSpecies(input, side, targetPokemon));
  };

  const summary = usePokemonSummary({
    side,
    commandStructure,
    parsedCommand,
    importedSets,
    pendingStatPoints,
  });

  const updateInlineStatPoint = (stat: StatKey, nextValue: number) => {
    if (!summary) {
      return;
    }

    const currentStatPoints =
      pendingStatPoints ??
      summary.promptStatPoints ??
      summary.effectiveStatPoints;
    const sanitizedValue = Math.max(0, Math.min(32, Math.round(nextValue)));
    const remainingTotal = STAT_LABELS.reduce(
      (total, [key]) => total + (key === stat ? 0 : currentStatPoints[key]),
      0,
    );
    const cappedValue = Math.max(
      0,
      Math.min(sanitizedValue, 66 - remainingTotal),
    );
    const nextStatPoints: StatSpread = {
      ...currentStatPoints,
      [stat]: cappedValue,
    };
    const input = useOmniStore.getState().input;
    const nextInput = rebuildInputWithStatPoints(
      input,
      side,
      nextStatPoints,
      Boolean(
        summary.importedSet || summary.promptStatPoints || pendingStatPoints,
      ),
    );

    setPendingStatPoints(nextStatPoints);
    setInput(nextInput);
  };

  const updateInlineStatInput = (
    stat: StatKey,
    rawValue: string,
    maxValue: number,
  ) => {
    if (!summary) {
      return;
    }

    const parsed = parseStatInputDraft(rawValue);
    if (!parsed.isValid) {
      return;
    }

    const nextMarkers = applyMarkerToState(natureMarkers, stat, parsed.marker);
    const nextNature = resolveNatureFromMarkerState(nextMarkers);

    setNatureMarkers(nextMarkers);

    if (summary.importedSet && nextNature !== summary.nature) {
      saveSet({
        ...summary.importedSet,
        nature: nextNature,
      });
      recompute();
    }

    if (parsed.isEmpty) {
      updateInlineStatPoint(stat, 0);
      return;
    }

    if (parsed.numericValue === null) {
      return;
    }

    updateInlineStatPoint(
      stat,
      Math.min(Math.max(0, Math.round(parsed.numericValue)), maxValue),
    );
  };

  const resolvedSetId = summary?.importedSet?.speciesId ?? null;

  // All imported sets that are NOT the currently displayed Pokémon
  const otherSets = useMemo(
    () =>
      Object.values(importedSets).filter((s) => s.speciesId !== resolvedSetId),
    [importedSets, resolvedSetId],
  );
  const editorInitialSet = useMemo(() => {
    if (!summary) {
      return null;
    }

    return createImportedSet({
      speciesId: summary.promptPokemonId,
      speciesName:
        pokemonById.get(summary.promptPokemonId)?.name ?? summary.name,
      nickname: summary.importedSet?.nickname,
      item: summary.item ?? undefined,
      ability: summary.ability ?? undefined,
      nature: summary.nature,
      statPoints: summary.effectiveStatPoints,
      moves: summary.importedSet?.moves.length
        ? summary.importedSet.moves
        : summary.move
          ? [summary.move]
          : [],
    });
  }, [summary]);

  const currentStatPoints =
    pendingStatPoints ??
    summary?.promptStatPoints ??
    summary?.effectiveStatPoints ??
    EMPTY_STAT_SPREAD;
  const summaryNature = summary?.nature ?? "Hardy";
  const derivedNatureMarkers =
    Object.keys(natureMarkers).length > 0
      ? natureMarkers
      : buildNatureMarkerState(summaryNature);

  if (!summary) {
    const importedSetList = Object.values(importedSets);

    return (
      <>
        <SummaryEmptyState
          side={side}
          hasImportedSets={importedSetList.length > 0}
          importedSetList={importedSetList}
          onSelectSet={(speciesId) => {
            const nextSet = importedSets[speciesId];
            if (nextSet) {
              handleSelectSet(nextSet);
            }
          }}
          onRemoveSet={handleRemoveSet}
          onOpenImport={() => setImportModalOpen(true)}
        />

        {importModalOpen && (
          <ImportSetModal onClose={() => setImportModalOpen(false)} />
        )}
      </>
    );
  }

  const { importedSet, stageBoosts, itemBoosts } = summary;
  const spLeft = Math.max(
    0,
    66 -
      STAT_LABELS.reduce((total, [key]) => total + currentStatPoints[key], 0),
  );
  const isSpDepleted = spLeft === 0;

  return (
    <aside
      data-testid={`${side}-summary`}
      className="theme-panel rounded-[28px] p-5"
    >
      <SummaryHeader
        title={summary.title}
        megaToggle={
          summary.megaTarget ? (
            <button
              type="button"
              onClick={() => {
                const megaTarget = summary.megaTarget;
                if (megaTarget) {
                  handleSwitchToMegaForm(megaTarget);
                }
              }}
              aria-label={
                summary.pokemonId === summary.megaTarget.id
                  ? "Switch to base form"
                  : "Switch to mega form"
              }
              title={
                summary.pokemonId === summary.megaTarget.id
                  ? "Base form"
                  : "Mega form"
              }
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full p-0 text-[11px] font-bold uppercase tracking-[0.08em] ${
                summary.pokemonId === summary.megaTarget.id
                  ? "theme-icon-button-active"
                  : "theme-icon-button"
              }`}
            >
              M
            </button>
          ) : null
        }
        removeAction={
          importedSet && resolvedSetId ? (
            <button
              type="button"
              aria-label={`Remove ${summary.name} set`}
              title="Remove set"
              onClick={() => {
                handleRemoveSet(resolvedSetId);
              }}
              className="theme-icon-button flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
              style={{ color: "var(--accent-text-mid)" }}
            >
              ×
            </button>
          ) : null
        }
      />

      <SummaryIdentityCard
        name={summary.name}
        spriteSources={summary.spriteSources}
        ability={summary.ability}
        item={summary.item}
        move={summary.move}
        side={side}
        importedNature={importedSet?.nature ?? null}
      />

      {importedSet && (
        <SummaryMoves
          importedSet={importedSet}
          activeMoveId={summary.activeMoveEntry?.id ?? null}
          side={side}
          onSelectMove={setAttackerMove}
        />
      )}

      <SummaryStatsGrid
        natureEffects={{
          atk: getNatureEffect(summary.nature, "atk"),
          def: getNatureEffect(summary.nature, "def"),
          spa: getNatureEffect(summary.nature, "spa"),
          spd: getNatureEffect(summary.nature, "spd"),
          spe: getNatureEffect(summary.nature, "spe"),
        }}
        stats={summary.stats}
        stageBoosts={stageBoosts}
        itemBoosts={itemBoosts}
        showLevelLabel={Boolean(importedSet || summary.promptStatPoints)}
        level={importedSet?.level ?? 50}
      />

      <SummarySpSpread
        side={side}
        currentStatPoints={currentStatPoints}
        derivedNatureMarkers={derivedNatureMarkers}
        isSpDepleted={isSpDepleted}
        spLeft={spLeft}
        onChangeInput={updateInlineStatInput}
        onChangeSlider={(statKey, requested, maxValue) => {
          updateInlineStatPoint(statKey, Math.min(requested, maxValue));
        }}
      />

      <SummarySetActions
        importedSet={importedSet}
        otherSets={otherSets}
        switchOpen={switchOpen}
        switchRef={switchRef}
        onToggleSwitch={() => setSwitchOpen((open) => !open)}
        onSelectSet={(set) => {
          handleSelectSet(set);
          setSwitchOpen(false);
        }}
        onSave={() => {
          if (editorInitialSet) {
            saveSet(editorInitialSet);
            recompute();
          }
        }}
        onEdit={() => setEditorOpen(true)}
        onImport={() => setImportModalOpen(true)}
        canSave={Boolean(editorInitialSet)}
      />

      {importModalOpen && (
        <ImportSetModal onClose={() => setImportModalOpen(false)} />
      )}
      {editorOpen && editorInitialSet && (
        <PokemonSetEditorModal
          initialSet={editorInitialSet}
          onClose={() => setEditorOpen(false)}
          onSave={(nextSet) => {
            const speciesChanged =
              editorInitialSet.speciesId !== nextSet.speciesId;
            if (editorInitialSet.speciesId !== nextSet.speciesId) {
              removeSet(editorInitialSet.speciesId);
            }
            saveSet(nextSet);
            if (speciesChanged) {
              const targetPokemon = pokemonById.get(nextSet.speciesId);
              if (targetPokemon) {
                const input = useOmniStore.getState().input;
                setInput(rebuildInputWithSpecies(input, side, targetPokemon));
              }
            }
            recompute();
            setEditorOpen(false);
          }}
        />
      )}
    </aside>
  );
}
