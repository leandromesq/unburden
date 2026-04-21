"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { unstable_batchedUpdates } from "react-dom";
import { useShallow } from "zustand/react/shallow";

import { EMPTY_STAT_SPREAD } from "@/lib/calc/stat-calc";
import { pokemonById } from "@/lib/data/loaders";
import { analyzeCommandStructure } from "@/lib/parser/command-structure";
import { joinTokenValues } from "@/lib/parser/tokenize";
import {
  rebuildInputWithSpecies,
  rebuildInputWithStatPoints,
  setNatureModifierToken,
  type SummarySide,
} from "@/lib/parser/input-mutations";
import {
  applyMarkerToState,
  buildStatInputDrafts,
  buildNatureMarkerState,
  parseStatInputDraft,
  resolveNatureFromMarkerState,
} from "@/lib/team/nature-markers";
import { createImportedSet } from "@/lib/team/imported-set-utils";
import { getCanonicalSetReferenceToken } from "@/lib/team/set-references";
import type { ImportedSet, PokemonEntry, StatSpread } from "@/lib/types";
import {
  SUMMARY_STAT_LABELS,
  type SummaryStatKey,
} from "@/components/omnibar/pokemon-summary/shared";
import { usePokemonSummary } from "@/components/omnibar/use-pokemon-summary";
import { useOmniStore } from "@/store/use-omni-store";
import { useTeamStore } from "@/store/use-team-store";

interface SummaryDraftState {
  contextKey: string;
  pendingStatPoints: StatSpread | null;
  pendingNature: string | null;
  natureMarkers: ReturnType<typeof buildNatureMarkerState>;
  statInputDrafts: ReturnType<typeof buildStatInputDrafts> | null;
}

const STAT_LABELS: Array<[SummaryStatKey, string]> = SUMMARY_STAT_LABELS;

function hasMarkerStateChanged(
  current: ReturnType<typeof buildNatureMarkerState>,
  next: ReturnType<typeof buildNatureMarkerState>,
) {
  return (
    current.atk !== next.atk ||
    current.def !== next.def ||
    current.spa !== next.spa ||
    current.spd !== next.spd ||
    current.spe !== next.spe
  );
}

function buildSetEditorKey(set: ImportedSet): string {
  return [
    set.speciesId,
    set.speciesName,
    set.nickname ?? "",
    set.item ?? "",
    set.ability ?? "",
    set.nature,
    set.moves.join("|"),
    set.statPoints.hp,
    set.statPoints.atk,
    set.statPoints.def,
    set.statPoints.spa,
    set.statPoints.spd,
    set.statPoints.spe,
  ].join("::");
}

function rebuildInputWithSetReference(
  input: string,
  side: SummarySide,
  referenceToken: string,
) {
  const structure = analyzeCommandStructure(input);
  const attackerTail = structure.attacker.rawTokens
    .slice(structure.attacker.speciesTokens.length)
    .map((token) => token.raw)
    .join(" ")
    .trim();
  const defenderTail = structure.defender.rawTokens
    .slice(structure.defender.speciesTokens.length)
    .map((token) => token.raw)
    .join(" ")
    .trim();
  const attackerSpecies =
    side === "attacker"
      ? referenceToken
      : (
          structure.attacker.speciesText ||
          joinTokenValues(structure.attacker.rawTokens)
        ).trim();
  const defenderSpecies =
    side === "defender"
      ? referenceToken
      : (
          structure.defender.speciesText ||
          joinTokenValues(structure.defender.rawTokens)
        ).trim();
  const attackerText = [attackerSpecies, attackerTail]
    .filter(Boolean)
    .join(" ")
    .trim();
  const defenderText = [defenderSpecies, defenderTail]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (!structure.lexed.hasDelimiter) {
    return attackerText;
  }

  return [attackerText, "x", defenderText].filter(Boolean).join(" ").trim();
}

export function usePokemonSideSummaryController(side: SummarySide) {
  const {
    commandStructure,
    parsedCommand,
    setAttackerMove,
    setInput,
    setInputImmediately,
    recompute,
  } = useOmniStore(
    useShallow((state) => ({
      commandStructure: state.commandStructure,
      parsedCommand: state.parsed,
      setAttackerMove: state.setAttackerMove,
      setInput: state.setInput,
      setInputImmediately: state.setInputImmediately,
      recompute: state.recompute,
    })),
  );
  const { importedSets, removeSet, replaceSet, saveSet } = useTeamStore(
    useShallow((state) => ({
      importedSets: state.importedSets,
      removeSet: state.removeSet,
      replaceSet: state.replaceSet,
      saveSet: state.saveSet,
    })),
  );
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [summaryDraftState, setSummaryDraftState] = useState<SummaryDraftState>(
    () => ({
      contextKey: "empty",
      pendingStatPoints: null,
      pendingNature: null,
      natureMarkers: buildNatureMarkerState("Hardy"),
      statInputDrafts: null,
    }),
  );

  const switchRef = useRef<HTMLDivElement>(null);

  const handleSwitchPointerDown = useEffectEvent((event: MouseEvent) => {
    if (switchRef.current && !switchRef.current.contains(event.target as Node)) {
      setSwitchOpen(false);
    }
  });

  useEffect(() => {
    if (!switchOpen) {
      return;
    }

    document.addEventListener("mousedown", handleSwitchPointerDown);
    return () =>
      document.removeEventListener("mousedown", handleSwitchPointerDown);
  }, [switchOpen]);

  const summary = usePokemonSummary({
    side,
    commandStructure,
    parsedCommand,
    importedSets,
    pendingContextKey: summaryDraftState.contextKey,
    pendingNature: summaryDraftState.pendingNature,
    pendingStatPoints: summaryDraftState.pendingStatPoints,
  });

  const summaryContextKey = summary?.contextKey ?? "empty";
  const summaryNature = summary?.nature ?? "Hardy";
  const pendingStatPoints =
    summaryDraftState.contextKey === summaryContextKey
      ? summaryDraftState.pendingStatPoints
      : null;
  const natureMarkers =
    summaryDraftState.contextKey === summaryContextKey
      ? summaryDraftState.natureMarkers
      : buildNatureMarkerState(summaryNature);

  const currentStatPoints =
    pendingStatPoints ??
    summary?.promptStatPoints ??
    summary?.effectiveStatPoints ??
    EMPTY_STAT_SPREAD;
  const derivedNatureMarkers =
    Object.keys(natureMarkers).length > 0
      ? natureMarkers
      : buildNatureMarkerState(summaryNature);
  const statInputDrafts =
    summaryDraftState.contextKey === summaryContextKey &&
    summaryDraftState.statInputDrafts
      ? summaryDraftState.statInputDrafts
      : buildStatInputDrafts(currentStatPoints, derivedNatureMarkers);
  const resolvedSetId = summary?.importedSet?.speciesId ?? null;
  const importedSetList = useMemo(
    () => Object.values(importedSets),
    [importedSets],
  );
  const otherSets = useMemo(
    () => importedSetList.filter((set) => set.speciesId !== resolvedSetId),
    [importedSetList, resolvedSetId],
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

  const editorModalKey = editorInitialSet
    ? buildSetEditorKey(editorInitialSet)
    : null;
  const spLeft = Math.max(
    0,
    66 - STAT_LABELS.reduce((total, [key]) => total + currentStatPoints[key], 0),
  );
  const isSpDepleted = spLeft === 0;

  const handleSelectSet = (nextSet: ImportedSet) => {
    const input = useOmniStore.getState().input;
    const structure = analyzeCommandStructure(input);
    const globalTokens = structure.globalTokens.map((token) => token.raw);
    const referenceToken = getCanonicalSetReferenceToken(nextSet);

    if (side === "attacker") {
      const defenderPart = structure.lexed.hasDelimiter
        ? " x " +
          [
            ...structure.defender.rawTokens.map((token) => token.raw),
            ...globalTokens,
          ].join(" ")
        : "";
      setInputImmediately((referenceToken + defenderPart).trim());
    } else {
      const attackerPart = structure.attacker.rawTokens
        .map((token) => token.raw)
        .join(" ")
        .trim();

      if (attackerPart) {
        setInputImmediately(
          [attackerPart, "x", referenceToken, ...globalTokens]
            .filter(Boolean)
            .join(" ")
            .trim(),
        );
      } else {
        setInputImmediately(referenceToken);
      }
    }

    setSwitchOpen(false);
  };

  const handleSelectSetBySpeciesId = (speciesId: string) => {
    const nextSet = importedSets[speciesId];
    if (nextSet) {
      handleSelectSet(nextSet);
    }
  };

  const syncPromptToSavedSet = (nextSet: ImportedSet) => {
    const input = useOmniStore.getState().input;
    const nextInput = rebuildInputWithSetReference(
      input,
      side,
      getCanonicalSetReferenceToken(nextSet),
    );

    if (nextInput !== input) {
      setInputImmediately(nextInput);
      return;
    }

    recompute();
  };

  const handleRemoveSet = (speciesId: string) => {
    removeSet(speciesId);
    recompute();
  };

  const handleSwitchToMegaForm = (targetPokemon: PokemonEntry) => {
    const input = useOmniStore.getState().input;
    if (summary?.importedSet) {
      const nextSet = createImportedSet({
        speciesId: targetPokemon.id,
        speciesName: targetPokemon.name,
        nickname: summary.importedSet.nickname,
        item: summary.importedSet.item ?? summary.item ?? undefined,
        ability: summary.importedSet.ability &&
          targetPokemon.abilities.includes(summary.importedSet.ability)
          ? summary.importedSet.ability
          : undefined,
        level: summary.importedSet.level,
        nature: summary.importedSet.nature,
        statPoints: summary.importedSet.statPoints,
        ivs: summary.importedSet.ivs,
        moves: summary.importedSet.moves,
        teraType: summary.importedSet.teraType,
      });

      const nextInput = rebuildInputWithSetReference(
        input,
        side,
        getCanonicalSetReferenceToken(nextSet),
      );

      unstable_batchedUpdates(() => {
        if (summary.importedSet.speciesId !== nextSet.speciesId) {
          replaceSet(summary.importedSet.speciesId, nextSet);
        } else {
          saveSet(nextSet);
        }
        setInputImmediately(nextInput);
      });
      return;
    }

    setInputImmediately(rebuildInputWithSpecies(input, side, targetPokemon));
  };

  const handleInlineStatPointChange = (
    stat: SummaryStatKey,
    nextValue: number,
  ) => {
    if (!summary) {
      return;
    }

    const sanitizedValue = Math.max(0, Math.min(32, Math.round(nextValue)));
    const remainingTotal = STAT_LABELS.reduce(
      (total, [key]) => total + (key === stat ? 0 : currentStatPoints[key]),
      0,
    );
    const cappedValue = Math.max(0, Math.min(sanitizedValue, 66 - remainingTotal));
    const nextStatPoints: StatSpread = {
      ...currentStatPoints,
      [stat]: cappedValue,
    };
    const input = useOmniStore.getState().input;
    const nextInput = rebuildInputWithStatPoints(
      input,
      side,
      nextStatPoints,
      Boolean(summary.importedSet || summary.promptStatPoints),
    );

    setSummaryDraftState((current) => ({
      contextKey: summaryContextKey,
      pendingStatPoints: nextStatPoints,
      pendingNature:
        current.contextKey === summaryContextKey ? current.pendingNature : null,
      natureMarkers:
        current.contextKey === summaryContextKey
          ? current.natureMarkers
          : buildNatureMarkerState(summaryNature),
      statInputDrafts: buildStatInputDrafts(
        nextStatPoints,
        current.contextKey === summaryContextKey
          ? current.natureMarkers
          : buildNatureMarkerState(summaryNature),
      ),
    }));
    setInput(nextInput);
  };

  const handleInlineStatInputChange = (
    stat: SummaryStatKey,
    rawValue: string,
    maxValue: number,
  ) => {
    if (!summary) {
      return;
    }

    const parsed = parseStatInputDraft(rawValue);
    setSummaryDraftState((current) => ({
      contextKey: summaryContextKey,
      pendingStatPoints:
        current.contextKey === summaryContextKey
          ? current.pendingStatPoints
          : null,
      pendingNature:
        current.contextKey === summaryContextKey ? current.pendingNature : null,
      natureMarkers:
        current.contextKey === summaryContextKey
          ? current.natureMarkers
          : buildNatureMarkerState(summaryNature),
      statInputDrafts: {
        ...(current.contextKey === summaryContextKey && current.statInputDrafts
          ? current.statInputDrafts
          : buildStatInputDrafts(currentStatPoints, derivedNatureMarkers)),
        [stat]: rawValue,
      },
    }));

    if (!parsed.isValid) {
      return;
    }

    const nextMarkers = applyMarkerToState(natureMarkers, stat, parsed.marker);
    const nextNature = resolveNatureFromMarkerState(nextMarkers);
    const markerStateChanged =
      stat !== "hp" && hasMarkerStateChanged(natureMarkers, nextMarkers);

    setSummaryDraftState((current) => ({
      contextKey: summaryContextKey,
      pendingStatPoints:
        current.contextKey === summaryContextKey
          ? current.pendingStatPoints
          : null,
      pendingNature: nextNature,
      natureMarkers: nextMarkers,
      statInputDrafts:
        current.contextKey === summaryContextKey
          ? current.statInputDrafts
          : buildStatInputDrafts(currentStatPoints, nextMarkers),
    }));

    if (summary.importedSet && markerStateChanged && nextNature !== summary.nature) {
      saveSet({
        ...summary.importedSet,
        nature: nextNature,
      });
      recompute();
    } else if (markerStateChanged) {
      const input = useOmniStore.getState().input;
      const nextInput = setNatureModifierToken(
        input,
        side,
        summary.moveId,
        summary.moveCategory,
        nextNature,
      );
      if (nextInput !== input) {
        setInput(nextInput);
      }
    }

    if (parsed.isEmpty) {
      handleInlineStatPointChange(stat, 0);
      return;
    }

    if (parsed.numericValue === null) {
      return;
    }

    handleInlineStatPointChange(
      stat,
      Math.min(Math.max(0, Math.round(parsed.numericValue)), maxValue),
    );
  };

  const handleSaveCurrentSet = () => {
    if (!summary || !editorInitialSet) {
      return;
    }

    unstable_batchedUpdates(() => {
      saveSet(editorInitialSet);
      syncPromptToSavedSet(editorInitialSet);
    });
  };

  const handleEditorSave = (nextSet: ImportedSet) => {
    if (!summary || !editorInitialSet) {
      return;
    }

    const previousSavedSpeciesId = summary.importedSet?.speciesId ?? null;
    unstable_batchedUpdates(() => {
      if (
        previousSavedSpeciesId &&
        previousSavedSpeciesId !== nextSet.speciesId
      ) {
        replaceSet(previousSavedSpeciesId, nextSet);
      } else {
        saveSet(nextSet);
      }

      syncPromptToSavedSet(nextSet);
    });
    setEditorOpen(false);
  };

  return {
    derivedNatureMarkers,
    editorInitialSet,
    editorModalKey,
    editorOpen,
    currentStatPoints,
    handleEditorSave,
    handleInlineStatInputChange,
    handleInlineStatPointChange,
    handleRemoveSet,
    handleSaveCurrentSet,
    handleSelectSetBySpeciesId,
    handleSwitchToMegaForm,
    importModalOpen,
    importedSetList,
    isSpDepleted,
    onSelectMove: setAttackerMove,
    openEditor: () => setEditorOpen(true),
    openImportModal: () => setImportModalOpen(true),
    otherSets,
    resolvedSetId,
    setEditorOpen,
    setImportModalOpen,
    spLeft,
    statInputDrafts,
    summary,
    switchOpen,
    switchRef,
    toggleSwitch: () => setSwitchOpen((open) => !open),
  };
}
