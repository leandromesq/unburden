"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { unstable_batchedUpdates } from "react-dom";
import { useShallow } from "zustand/react/shallow";

import { EMPTY_STAT_SPREAD } from "@/lib/calc/stat-calc";
import { resolveAttackingStatKey } from "@/lib/calc/move-stat-context";
import {
  getCanonicalPromptPokemonName,
  itemDisplayById,
  legalPokemonData,
  learnsetByPokemonId,
  moveById,
  normalizeId,
  pokemonById,
  vgcMetaByPokemonId,
} from "@/lib/data/loaders";
import { analyzeCommandStructure } from "@/lib/parser/command-structure";
import { resolveExactPokemonEntity } from "@/lib/parser/fuse-indexes";
import {
  ATTACKER_MODIFIER_MAP,
  DEFENDER_MODIFIER_MAP,
  buildCommonAbilities,
  normalizeModifierValue,
  slugifySymbolValue,
} from "@/lib/parser/grammar";
import {
  rebuildInputWithStatPoints,
  setAbilityToken,
  setHpPercentageToken,
  setItemToken,
  setNamedStageModifierToken,
  setNatureModifierToken,
  setStatusModifierToken,
  setStatModifierToken,
  type SummarySide,
} from "@/lib/parser/input-mutations";
import { createImportedSet } from "@/lib/team/imported-set-utils";
import {
  applyMarkerToState,
  buildNatureMarkerState,
  buildStatInputDrafts,
  parseStatInputDraft,
  resolveNatureFromMarkerState,
} from "@/lib/team/nature-markers";
import { getCanonicalSetReferenceToken } from "@/lib/team/set-references";
import type {
  ImportedSet,
  PokemonEntry,
  PokemonStatus,
  StatSpread,
} from "@/lib/types";
import {
  formatSummaryStatus,
  formatNatureWithDescription,
  SUMMARY_NATURES,
  SUMMARY_STAT_LABELS,
  SUMMARY_STATUS_OPTIONS,
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

interface SummaryEditorState {
  syncKey: string;
  speciesInput: string;
  nicknameInput: string;
  itemInput: string;
  abilityInput: string;
  statusInput: string;
  moveInputs: string[];
  selectedMoveIndex: number | null;
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

function buildMovesDraft(moves: string[]) {
  const next = [...moves];
  while (next.length < 4) {
    next.push("");
  }
  return next.slice(0, 4);
}

function resolveExactMoveType(moveName: string) {
  return moveById.get(normalizeId(moveName))?.type ?? null;
}

function buildEditorSyncKey(
  summary: ReturnType<typeof usePokemonSummary> | null,
) {
  if (!summary) {
    return "empty";
  }

  return [
    summary.contextKey,
    summary.name,
    summary.item ?? "",
    summary.status ?? "",
    summary.importedSet?.nickname ?? "",
    summary.importedSet?.moves.join("|") ?? "",
  ].join("::");
}

function resolveMoveIndex(
  moveInputs: string[],
  moveName: string | null,
) {
  if (!moveName) {
    return -1;
  }

  return moveInputs.findIndex(
    (entry) => normalizeId(entry) === normalizeId(moveName),
  );
}

function syncMoveDraft(
  baseMoveInputs: string[],
  promptMoveName: string | null,
  selectedMoveIndex: number | null,
  side: SummarySide,
) {
  const moveInputs = buildMovesDraft(baseMoveInputs);

  if (side !== "attacker") {
    return {
      moveInputs,
      selectedMoveIndex: null,
    };
  }

  if (!promptMoveName?.trim()) {
    return {
      moveInputs,
      selectedMoveIndex,
    };
  }

  const existingIndex = resolveMoveIndex(moveInputs, promptMoveName);
  if (existingIndex >= 0) {
    return {
      moveInputs,
      selectedMoveIndex: existingIndex,
    };
  }

  const replacementIndex = Math.min(
    Math.max(selectedMoveIndex ?? 0, 0),
    moveInputs.length - 1,
  );
  moveInputs[replacementIndex] = promptMoveName;

  return {
    moveInputs,
    selectedMoveIndex: replacementIndex,
  };
}

function buildEditorState(
  summary: ReturnType<typeof usePokemonSummary> | null,
  current: SummaryEditorState,
  side: SummarySide,
): SummaryEditorState {
  if (!summary) {
    return {
      syncKey: "empty",
      speciesInput: "",
      nicknameInput: "",
      itemInput: "",
      abilityInput: "",
      statusInput: "",
      moveInputs: buildMovesDraft([]),
      selectedMoveIndex: null,
    };
  }

  const syncKey = buildEditorSyncKey(summary);
  const isSameContext = current.syncKey === syncKey;
  const baseMoveInputs = summary.importedSet
    ? buildMovesDraft(summary.importedSet.moves)
    : isSameContext
      ? current.moveInputs
      : buildMovesDraft(summary.move ? [summary.move] : []);
  const nextMoveDraft = syncMoveDraft(
    baseMoveInputs,
    summary.move,
    isSameContext ? current.selectedMoveIndex : null,
    side,
  );

  return {
    syncKey,
    speciesInput: isSameContext
      ? current.speciesInput
      : (pokemonById.get(summary.promptPokemonId)?.name ?? summary.name),
    nicknameInput: isSameContext
      ? current.nicknameInput
      : (summary.importedSet?.nickname ?? ""),
    itemInput: isSameContext ? current.itemInput : (summary.item ?? ""),
    abilityInput: isSameContext ? current.abilityInput : (summary.ability ?? ""),
    statusInput: isSameContext
      ? current.statusInput
      : formatSummaryStatus(summary.status),
    moveInputs: nextMoveDraft.moveInputs,
    selectedMoveIndex: nextMoveDraft.selectedMoveIndex,
  };
}

function buildInputFromSegments(
  structure: ReturnType<typeof analyzeCommandStructure>,
  attackerTokens: string[],
  defenderTokens: string[],
) {
  const nextAttackerTokens = attackerTokens.filter(
    (token) => !token.startsWith("~"),
  );
  const nextDefenderTokens = defenderTokens.filter(
    (token) => !token.startsWith("~"),
  );
  const globalTokens = structure.globalTokens.map((token) => token.raw);

  if (!structure.lexed.hasDelimiter && nextDefenderTokens.length === 0) {
    return [...nextAttackerTokens, ...globalTokens].join(" ").trim();
  }

  return [
    nextAttackerTokens.join(" ").trim(),
    "x",
    nextDefenderTokens.join(" ").trim(),
    ...globalTokens,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function replaceSideTokens(
  input: string,
  side: SummarySide,
  nextTokens: string[],
) {
  const structure = analyzeCommandStructure(input);
  const attackerTokens =
    side === "attacker"
      ? nextTokens
      : structure.attacker.rawTokens.map((token) => token.raw);
  const defenderTokens =
    side === "defender"
      ? nextTokens
      : structure.defender.rawTokens.map((token) => token.raw);

  return buildInputFromSegments(structure, attackerTokens, defenderTokens);
}

function isNaturePromptToken(raw: string, side: SummarySide) {
  const definition =
    (side === "attacker" ? ATTACKER_MODIFIER_MAP : DEFENDER_MODIFIER_MAP).get(
      normalizeModifierValue(raw),
    );

  return definition?.kind === "nature";
}

function rewriteAttackerMove(input: string, moveName: string | null) {
  const structure = analyzeCommandStructure(input);
  const attackerTokens = structure.attacker.rawTokens
    .filter((token) => {
      const normalized = token.normalized;
      return !normalized.startsWith("m:") && !normalized.startsWith("!");
    })
    .map((token) => token.raw);
  const nextAttackerTokens = moveName
    ? [...attackerTokens, `!${slugifySymbolValue(moveName)}`]
    : attackerTokens;

  return buildInputFromSegments(
    structure,
    nextAttackerTokens,
    structure.defender.rawTokens.map((token) => token.raw),
  );
}

function compactSideToSetReference(
  input: string,
  side: SummarySide,
  referenceToken: string,
  explicitAttackerMoveName: string | null,
) {
  const structure = analyzeCommandStructure(input);
  const segment =
    side === "attacker" ? structure.attacker : structure.defender;
  const preservedTail = segment.rawTokens
    .slice(segment.speciesTokens.length)
    .filter((token) => {
      if (token.normalized.startsWith("@")) {
        return false;
      }

      if (token.normalized.startsWith("sp:")) {
        return false;
      }

      if (/^\[.+\]$/.test(token.raw)) {
        return false;
      }

      if (isNaturePromptToken(token.raw, side)) {
        return false;
      }

      if (side === "attacker" && /^(m:|!)/i.test(token.normalized)) {
        return false;
      }

      return true;
    })
    .map((token) => token.raw);
  const compactInput = replaceSideTokens(input, side, [
    referenceToken,
    ...preservedTail,
  ]);

  if (side === "attacker" && explicitAttackerMoveName) {
    return rewriteAttackerMove(compactInput, explicitAttackerMoveName);
  }

  return compactInput;
}

function rewritePromptSpecies(
  input: string,
  side: SummarySide,
  targetPokemon: PokemonEntry,
) {
  const structure = analyzeCommandStructure(input);
  const segment =
    side === "attacker" ? structure.attacker : structure.defender;
  const nextTokens = [
    getCanonicalPromptPokemonName(targetPokemon),
    ...segment.rawTokens
      .slice(segment.speciesTokens.length)
      .filter((token) => !/^\[.+\]$/.test(token.raw))
      .map((token) => token.raw),
  ];

  return replaceSideTokens(input, side, nextTokens);
}

function buildSavedMoveList(
  moveInputs: string[],
) {
  const trimmedMoves = moveInputs
    .map((move) => move.trim())
    .filter(Boolean);
  const dedupedMoves: string[] = [];

  for (const move of trimmedMoves) {
    if (!dedupedMoves.some((entry) => normalizeId(entry) === normalizeId(move))) {
      dedupedMoves.push(move);
    }
  }

  return dedupedMoves.slice(0, 4);
}

function resolveCommittedItemName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return itemDisplayById.get(normalizeId(trimmed)) ?? null;
}

function resolveCommittedMoveName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return moveById.get(normalizeId(trimmed))?.name ?? "";
}

function resolveCommittedAbilityName(
  value: string,
  options: string[],
) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return (
    options.find((option) => normalizeId(option) === normalizeId(trimmed)) ??
    null
  );
}

function resolveCommittedNatureName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return (
    SUMMARY_NATURES.find((nature) => {
      const formattedNature = formatNatureWithDescription(nature);
      return (
        normalizeId(nature) === normalizeId(trimmed) ||
        normalizeId(formattedNature) === normalizeId(trimmed)
      );
    }) ?? null
  );
}

function resolveCommittedStatus(
  value: string,
): PokemonStatus | null | undefined {
  const normalized = normalizeModifierValue(value);

  if (!normalized || normalized === "healthy" || normalized === "none") {
    return null;
  }

  if (normalized === "burn") {
    return "brn";
  }

  if (normalized === "par" || normalized === "para" || normalized === "paralysis") {
    return "par";
  }

  if (normalized === "poison") {
    return "psn";
  }

  if (normalized === "sleep") {
    return "slp";
  }

  if (normalized === "freeze") {
    return "frz";
  }

  return undefined;
}

export function usePokemonSideSummaryController(side: SummarySide) {
  const {
    input,
    commandStructure,
    parsedCommand,
    setInput,
    setInputImmediately,
    recompute,
  } = useOmniStore(
    useShallow((state) => ({
      input: state.input,
      commandStructure: state.commandStructure,
      parsedCommand: state.parsed,
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
  const [editorState, setEditorState] = useState<SummaryEditorState>({
    syncKey: "empty",
    speciesInput: "",
    nicknameInput: "",
    itemInput: "",
    abilityInput: "",
    statusInput: "",
    moveInputs: buildMovesDraft([]),
    selectedMoveIndex: null,
  });

  const switchRef = useRef<HTMLDivElement>(null);

  const handleSwitchPointerDown = useCallback((event: MouseEvent) => {
    if (switchRef.current && !switchRef.current.contains(event.target as Node)) {
      setSwitchOpen(false);
    }
  }, []);

  useEffect(() => {
    if (!switchOpen) {
      return;
    }

    document.addEventListener("mousedown", handleSwitchPointerDown);
    return () =>
      document.removeEventListener("mousedown", handleSwitchPointerDown);
  }, [handleSwitchPointerDown, switchOpen]);

  const summary = usePokemonSummary({
    side,
    commandStructure,
    parsedCommand,
    importedSets,
    pendingContextKey: summaryDraftState.contextKey,
    pendingNature: summaryDraftState.pendingNature,
    pendingStatPoints: summaryDraftState.pendingStatPoints,
  });

  const syncedEditorState = useMemo(
    () => buildEditorState(summary, editorState, side),
    [editorState, summary, side],
  );

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

  const summaryPokemon = useMemo(() => {
    if (!summary) {
      return null;
    }

    return (
      pokemonById.get(summary.promptPokemonId) ??
      pokemonById.get(summary.pokemonId) ??
      null
    );
  }, [summary]);
  const profile = useMemo(
    () =>
      summaryPokemon ? vgcMetaByPokemonId.get(summaryPokemon.id) : undefined,
    [summaryPokemon],
  );
  const resolvedDraftSpecies = useMemo(
    () => resolveExactPokemonEntity(syncedEditorState.speciesInput)?.entry ?? null,
    [syncedEditorState.speciesInput],
  );
  const resolvedSetId = summary?.importedSet?.speciesId ?? null;
  const importedSetList = useMemo(
    () => Object.values(importedSets),
    [importedSets],
  );
  const otherSets = useMemo(
    () => importedSetList.filter((set) => set.speciesId !== resolvedSetId),
    [importedSetList, resolvedSetId],
  );
  const spLeft = Math.max(
    0,
    66 - STAT_LABELS.reduce((total, [key]) => total + currentStatPoints[key], 0),
  );
  const isSpDepleted = spLeft === 0;
  const hasExplicitAttackerMove =
    side === "attacker" && Boolean(commandStructure.attacker.moveToken);
  const preservedExplicitMoveName =
    hasExplicitAttackerMove ? summary?.move ?? null : null;
  const speciesOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...(summaryPokemon ? [summaryPokemon.name] : []),
          ...legalPokemonData.map((entry) => entry.name),
        ]),
      ).sort((left, right) => left.localeCompare(right)),
    [summaryPokemon],
  );
  const itemOptions = useMemo(() => {
    const prioritized = [
      profile?.defaultItem,
      ...(profile?.commonItems ?? []),
      ...Array.from(itemDisplayById.values()),
    ].filter(Boolean) as string[];

    return Array.from(new Set(prioritized));
  }, [profile]);
  const abilityOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [
            summary?.ability,
            ...buildCommonAbilities(profile, summaryPokemon?.abilities ?? []),
          ].filter(Boolean),
        ),
      ) as string[],
    [profile, summary?.ability, summaryPokemon?.abilities],
  );
  const statusOptions = useMemo(
    () => [...SUMMARY_STATUS_OPTIONS],
    [],
  );
  const moveOptions = useMemo(() => {
    const learnset = summaryPokemon
      ? (learnsetByPokemonId.get(summaryPokemon.id) ??
        (summaryPokemon.baseSpeciesId
          ? learnsetByPokemonId.get(summaryPokemon.baseSpeciesId)
          : undefined))
      : undefined;
    const prioritizedMoveIds = [
      profile?.defaultMove,
      ...(profile?.commonMoves ?? []),
      ...(learnset?.moveIds ?? []),
      ...syncedEditorState.moveInputs,
    ].filter(Boolean) as string[];

    return Array.from(
      new Set(
        prioritizedMoveIds
          .map((moveId) => moveById.get(normalizeId(moveId))?.name)
          .filter(Boolean) as string[],
      ),
    );
  }, [profile, summaryPokemon, syncedEditorState.moveInputs]);
  const moveInputTypes = useMemo(
    () => syncedEditorState.moveInputs.map((move) => resolveExactMoveType(move)),
    [syncedEditorState.moveInputs],
  );
  const canSaveSet = Boolean(summary && !summary.importedSet && resolvedDraftSpecies);

  const buildCurrentSet = useCallback(
    (overrides?: {
      species?: PokemonEntry;
      nickname?: string | undefined;
      item?: string | undefined;
      ability?: string | undefined;
      nature?: string;
      statPoints?: StatSpread;
      moves?: string[];
    }) => {
      const species = overrides?.species ?? summaryPokemon;
      if (!summary || !species) {
        return null;
      }

      return createImportedSet({
        speciesId: species.id,
        speciesName: species.name,
        nickname:
          overrides?.nickname ?? summary.importedSet?.nickname ?? undefined,
        item: overrides?.item ?? summary.item ?? undefined,
        ability: overrides?.ability ?? summary.ability ?? undefined,
        nature: overrides?.nature ?? summary.nature,
        statPoints: overrides?.statPoints ?? currentStatPoints,
        moves:
          overrides?.moves ??
          buildSavedMoveList(
            summary.importedSet?.moves.length
              ? summary.importedSet.moves
              : summary.move
                ? [summary.move]
                : [],
          ),
      });
    },
    [currentStatPoints, summary, summaryPokemon],
  );

  const getCurrentExportSet = useCallback(() => {
    const resolvedItem =
      resolveCommittedItemName(syncedEditorState.itemInput) ??
      summary?.item ??
      undefined;

    return buildCurrentSet({
      nickname: syncedEditorState.nicknameInput.trim() || undefined,
      item: resolvedItem,
      moves: buildSavedMoveList(syncedEditorState.moveInputs),
    });
  }, [
    buildCurrentSet,
    summary?.item,
    syncedEditorState.itemInput,
    syncedEditorState.moveInputs,
    syncedEditorState.nicknameInput,
  ]);

  const commitReferencedSet = useCallback(
    (
      nextSet: ImportedSet,
      explicitAttackerMoveName: string | null = preservedExplicitMoveName,
    ) => {
      if (!summary?.importedSet) {
        return;
      }

      const previousSavedSpeciesId = summary.importedSet.speciesId;
      const nextInput = compactSideToSetReference(
        input,
        side,
        getCanonicalSetReferenceToken(nextSet),
        explicitAttackerMoveName,
      );

      unstable_batchedUpdates(() => {
        if (previousSavedSpeciesId !== nextSet.speciesId) {
          replaceSet(previousSavedSpeciesId, nextSet);
        } else {
          saveSet(nextSet);
        }

        if (nextInput !== input) {
          setInputImmediately(nextInput);
        } else {
          recompute();
        }
      });
    },
    [
      input,
      preservedExplicitMoveName,
      recompute,
      replaceSet,
      saveSet,
      setInputImmediately,
      side,
      summary,
    ],
  );

  const handleSelectSet = (nextSet: ImportedSet) => {
    const structure = analyzeCommandStructure(input);
    const referenceToken = getCanonicalSetReferenceToken(nextSet);
    const nextInput = buildInputFromSegments(
      structure,
      side === "attacker"
        ? [referenceToken]
        : structure.attacker.rawTokens.map((token) => token.raw),
      side === "defender"
        ? [referenceToken]
        : structure.defender.rawTokens.map((token) => token.raw),
    );

    setInputImmediately(nextInput);

    setSwitchOpen(false);
  };

  const handleSelectSetBySpeciesId = (speciesId: string) => {
    const nextSet = importedSets[speciesId];
    if (nextSet) {
      handleSelectSet(nextSet);
    }
  };

  const handleRemoveSet = (speciesId: string) => {
    removeSet(speciesId);
    recompute();
  };

  const syncDraftNature = useCallback((nextNature: string) => {
    const nextMarkers = buildNatureMarkerState(nextNature);
    setSummaryDraftState((current) => ({
      contextKey: summaryContextKey,
      pendingStatPoints:
        current.contextKey === summaryContextKey
          ? current.pendingStatPoints
          : null,
      pendingNature: nextNature,
      natureMarkers: nextMarkers,
      statInputDrafts: buildStatInputDrafts(currentStatPoints, nextMarkers),
    }));
  }, [currentStatPoints, summaryContextKey]);

  const handleSwitchToMegaForm = (targetPokemon: PokemonEntry) => {
    if (!summary) {
      return;
    }

    if (summary.importedSet) {
      const nextSet = buildCurrentSet({
        species: targetPokemon,
        ability: summary.importedSet.ability &&
          targetPokemon.abilities.includes(summary.importedSet.ability)
          ? summary.importedSet.ability
          : undefined,
      });

      if (nextSet) {
        commitReferencedSet(nextSet);
      }

      return;
    }

    setInputImmediately(rewritePromptSpecies(input, side, targetPokemon));
  };

  const handleInlineStatPointChange = (
    stat: SummaryStatKey,
    nextValue: number,
    nextNatureOverride?: string,
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
    const nextNature = nextNatureOverride ?? summaryNature;

    setSummaryDraftState((current) => ({
      contextKey: summaryContextKey,
      pendingStatPoints: nextStatPoints,
      pendingNature:
        current.contextKey === summaryContextKey
          ? (nextNatureOverride ?? current.pendingNature)
          : nextNatureOverride ?? null,
      natureMarkers:
        current.contextKey === summaryContextKey
          ? current.natureMarkers
          : buildNatureMarkerState(nextNature),
      statInputDrafts: buildStatInputDrafts(
        nextStatPoints,
        current.contextKey === summaryContextKey
          ? current.natureMarkers
          : buildNatureMarkerState(nextNature),
      ),
    }));

    if (summary.importedSet) {
      const nextSet = buildCurrentSet({
        nature: nextNature,
        statPoints: nextStatPoints,
      });
      if (nextSet) {
        commitReferencedSet(nextSet);
      }
      return;
    }

    const nextInput = rebuildInputWithStatPoints(
      input,
      side,
      nextStatPoints,
      Boolean(summary.promptStatPoints),
    );
    setInput(
      setNatureModifierToken(
        nextInput,
        side,
        summary.moveId,
        summary.moveCategory,
        nextNature,
      ),
    );
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

    if (markerStateChanged) {
      if (summary.importedSet) {
        const nextSet = buildCurrentSet({ nature: nextNature });
        if (nextSet) {
          commitReferencedSet(nextSet);
        }
      } else {
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
    }

    if (parsed.isEmpty) {
      handleInlineStatPointChange(stat, 0, nextNature);
      return;
    }

    if (parsed.numericValue === null) {
      return;
    }

    handleInlineStatPointChange(
      stat,
      Math.min(Math.max(0, Math.round(parsed.numericValue)), maxValue),
      nextNature,
    );
  };

  const handleSpeciesInputChange = (value: string) => {
    setEditorState((current) => ({
      ...current,
      speciesInput: value,
    }));
  };

  const commitSpeciesSelection = useCallback((value: string) => {
    const nextPokemon = resolveExactPokemonEntity(value)?.entry ?? null;
    if (!nextPokemon) {
      if (!summary) {
        return;
      }

      setEditorState((current) => ({
        ...current,
        speciesInput: summaryPokemon?.name ?? summary.name,
      }));
      return;
    }

    if (summary?.importedSet) {
      const nextSet = buildCurrentSet({ species: nextPokemon });
      if (nextSet) {
        commitReferencedSet(nextSet);
      }
      return;
    }

    setInputImmediately(rewritePromptSpecies(input, side, nextPokemon));
  }, [
    buildCurrentSet,
    commitReferencedSet,
    input,
    setInputImmediately,
    side,
    summary,
    summaryPokemon?.name,
  ]);

  const handleNicknameChange = (value: string) => {
    setEditorState((current) => ({
      ...current,
      nicknameInput: value,
    }));
  };

  const handleNicknameCommit = useCallback(() => {
    if (!summary?.importedSet) {
      return;
    }

    const trimmedNickname = syncedEditorState.nicknameInput.trim() || undefined;
    if (trimmedNickname === summary.importedSet.nickname) {
      return;
    }

    const nextSet = buildCurrentSet({ nickname: trimmedNickname });
    if (nextSet) {
      commitReferencedSet(nextSet);
    }
  }, [
    buildCurrentSet,
    commitReferencedSet,
    summary,
    syncedEditorState.nicknameInput,
  ]);

  const handleItemInputChange = (value: string) => {
    setEditorState((current) => ({
      ...current,
      itemInput: value,
    }));
  };

  const handleStatusInputChange = (value: string) => {
    setEditorState((current) => ({
      ...current,
      statusInput: value,
    }));
  };

  const handleAbilityInputChange = (value: string) => {
    setEditorState((current) => ({
      ...current,
      abilityInput: value,
    }));
  };

  const commitItemSelection = useCallback((value: string) => {
    if (!summary) {
      return;
    }

    const nextItem = value.trim()
      ? (resolveCommittedItemName(value) ?? summary.item ?? null)
      : null;
    setEditorState((current) => ({
      ...current,
      itemInput: nextItem ?? "",
    }));

    if (summary.importedSet) {
      const nextSet = buildCurrentSet({ item: nextItem ?? undefined });
      if (nextSet) {
        commitReferencedSet(nextSet);
      }
      return;
    }

    setInputImmediately(setItemToken(input, side, nextItem));
  }, [
    buildCurrentSet,
    commitReferencedSet,
    input,
    setInputImmediately,
    side,
    summary,
  ]);

  const commitAbilitySelection = useCallback((value: string) => {
    if (!summary) {
      return;
    }

    const nextAbility =
      resolveCommittedAbilityName(value, abilityOptions) ?? summary.ability;
    setEditorState((current) => ({
      ...current,
      abilityInput: nextAbility ?? "",
    }));
    if (!nextAbility || nextAbility === summary.ability) {
      return;
    }

    if (summary.importedSet) {
      const nextSet = buildCurrentSet({ ability: nextAbility });
      if (nextSet) {
        commitReferencedSet(nextSet);
      }
      return;
    }

    setInputImmediately(setAbilityToken(input, side, nextAbility));
  }, [
    abilityOptions,
    buildCurrentSet,
    commitReferencedSet,
    input,
    setInputImmediately,
    side,
    summary,
  ]);

  const commitNatureSelection = useCallback((value: string) => {
    if (!summary) {
      return;
    }

    const nextNature = resolveCommittedNatureName(value);
    if (!nextNature || nextNature === summary.nature) {
      return;
    }

    syncDraftNature(nextNature);

    if (summary.importedSet) {
      const nextSet = buildCurrentSet({ nature: nextNature });
      if (nextSet) {
        commitReferencedSet(nextSet);
      }
      return;
    }

    const nextInput = setNatureModifierToken(
      input,
      side,
      summary.moveId,
      summary.moveCategory,
      nextNature,
    );
    if (nextInput !== input) {
      setInputImmediately(nextInput);
    }
  }, [
    buildCurrentSet,
    commitReferencedSet,
    input,
    setInputImmediately,
    side,
    summary,
    syncDraftNature,
  ]);

  const commitStatusSelection = useCallback((value: string) => {
    if (!summary) {
      return;
    }

    const nextStatus = resolveCommittedStatus(value);
    if (nextStatus === undefined) {
      setEditorState((current) => ({
        ...current,
        statusInput: formatSummaryStatus(summary.status),
      }));
      return;
    }

    setEditorState((current) => ({
      ...current,
      statusInput: formatSummaryStatus(nextStatus),
    }));

    const nextInput = setStatusModifierToken(input, side, nextStatus);
    if (nextInput !== input) {
      setInputImmediately(nextInput);
    }
  }, [input, setInputImmediately, side, summary]);

  const handleMoveInputChange = (index: number, value: string) => {
    setEditorState((current) => {
      const nextMoveInputs = [...current.moveInputs];
      nextMoveInputs[index] = value;
      return {
        ...current,
        moveInputs: nextMoveInputs,
      };
    });
  };

  const commitMoveSelection = useCallback((index: number, value: string) => {
    if (!summary) {
      return;
    }

    const nextMoveName = value.trim() ? resolveCommittedMoveName(value) : "";

    if (value.trim() && !nextMoveName) {
      setEditorState((current) => {
        const nextMoveInputs = [...current.moveInputs];
        nextMoveInputs[index] = "";
        return {
          ...current,
          moveInputs: buildMovesDraft(nextMoveInputs),
        };
      });
      return;
    }

    const nextMoveInputs = [...syncedEditorState.moveInputs];
    nextMoveInputs[index] = nextMoveName;
    setEditorState((current) => ({
      ...current,
      moveInputs: buildMovesDraft(nextMoveInputs),
    }));

    if (summary.importedSet) {
      const nextSet = buildCurrentSet({
        moves: buildSavedMoveList(nextMoveInputs),
      });
      if (nextSet) {
        const nextExplicitMove =
          side === "attacker" &&
          syncedEditorState.selectedMoveIndex === index &&
          summary.move
            ? nextMoveName || null
            : preservedExplicitMoveName;
        const shouldClearExplicitMove =
          side === "attacker" &&
          summary.move &&
          !buildSavedMoveList(nextMoveInputs).some(
            (move) => normalizeId(move) === normalizeId(summary.move ?? ""),
          );
        commitReferencedSet(
          nextSet,
          shouldClearExplicitMove ? null : nextExplicitMove,
        );
      }
      return;
    }

    if (side === "attacker" && syncedEditorState.selectedMoveIndex === index) {
      setInputImmediately(rewriteAttackerMove(input, nextMoveName || null));
    }
  }, [
    buildCurrentSet,
    commitReferencedSet,
    input,
    preservedExplicitMoveName,
    setInputImmediately,
    side,
    summary,
    syncedEditorState.moveInputs,
    syncedEditorState.selectedMoveIndex,
  ]);

  const handleSelectActiveMove = (index: number, moveName: string) => {
    if (!summary || side !== "attacker") {
      return;
    }

    setEditorState((current) => ({
      ...current,
      selectedMoveIndex: index,
    }));

    if (summary.importedSet) {
      const nextSet = buildCurrentSet();
      if (nextSet) {
        commitReferencedSet(nextSet, moveName);
      }
      return;
    }

    setInputImmediately(rewriteAttackerMove(input, moveName));
  };

  const handleStageValueChange = (
    stat: SummaryStatKey,
    nextValue: number,
  ) => {
    if (!summary) {
      return;
    }

    if (stat === "hp") {
      const sanitizedPercent = Math.max(
        1,
        Math.min(100, Math.round(nextValue)),
      );
      const nextInput = setHpPercentageToken(
        input,
        side,
        sanitizedPercent >= 100 ? null : sanitizedPercent,
      );

      if (nextInput !== input) {
        setInputImmediately(nextInput);
      }

      return;
    }

    const clampedValue = Math.max(-6, Math.min(6, Math.round(nextValue)));
    const relevantGenericStageStat =
      side === "attacker"
        ? resolveAttackingStatKey(summary.moveId, summary.moveCategory)
        : summary.moveCategory === "Special"
          ? "spd"
          : "def";
    const inputWithoutGenericStage =
      stat === relevantGenericStageStat
        ? setStatModifierToken(input, side, 0)
        : input;
    const nextInput = setNamedStageModifierToken(
      inputWithoutGenericStage,
      side,
      stat,
      clampedValue,
    );

    if (nextInput !== input) {
      setInputImmediately(nextInput);
    }
  };

  const handleSaveCurrentSet = () => {
    if (!summary || summary.importedSet || !resolvedDraftSpecies) {
      return;
    }

    const nextSet = createImportedSet({
      speciesId: resolvedDraftSpecies.id,
      speciesName: resolvedDraftSpecies.name,
      nickname: syncedEditorState.nicknameInput.trim() || undefined,
      item:
        resolveCommittedItemName(syncedEditorState.itemInput) ??
        summary.item ??
        undefined,
      ability: summary.ability ?? undefined,
      nature: summary.nature,
      statPoints: currentStatPoints,
      moves: buildSavedMoveList(syncedEditorState.moveInputs),
    });
    const nextInput = compactSideToSetReference(
      input,
      side,
      getCanonicalSetReferenceToken(nextSet),
      side === "attacker" ? summary.move ?? null : null,
    );

    unstable_batchedUpdates(() => {
      saveSet(nextSet);
      if (nextInput !== input) {
        setInputImmediately(nextInput);
      } else {
        recompute();
      }
    });
  };

  return {
    abilityOptions,
    canSaveSet,
    currentStatPoints,
    getCurrentExportSet,
    handleInlineStatInputChange,
    handleInlineStatPointChange,
    handleAbilityInputChange,
    handleItemInputChange,
    handleMoveInputChange,
    handleNicknameChange,
    handleRemoveSet,
    handleSaveCurrentSet,
    handleStageValueChange,
    handleSelectActiveMove,
    handleSelectSetBySpeciesId,
    handleSwitchToMegaForm,
    importModalOpen,
    importedSetList,
    isSpDepleted,
    itemInput: syncedEditorState.itemInput,
    abilityInput: syncedEditorState.abilityInput,
    itemOptions,
    moveInputTypes,
    moveInputs: syncedEditorState.moveInputs,
    moveOptions,
    nicknameInput: syncedEditorState.nicknameInput,
    onCommitAbility: commitAbilitySelection,
    onCommitItem: commitItemSelection,
    onCommitMove: commitMoveSelection,
    onCommitNature: commitNatureSelection,
    onCommitNickname: handleNicknameCommit,
    onCommitSpecies: commitSpeciesSelection,
    onCommitStatus: commitStatusSelection,
    onInputSpecies: handleSpeciesInputChange,
    onInputStatus: handleStatusInputChange,
    onSelectMove: handleSelectActiveMove,
    openImportModal: () => setImportModalOpen(true),
    otherSets,
    resolvedSetId,
    setImportModalOpen,
    speciesInput: syncedEditorState.speciesInput,
    speciesOptions,
    statusInput: syncedEditorState.statusInput,
    statusOptions,
    spLeft,
    statInputDrafts,
    summary,
    switchOpen,
    switchRef,
    toggleSwitch: () => setSwitchOpen((open) => !open),
  };
}
