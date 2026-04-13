"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import {
  getCanonicalPromptPokemonName,
  getPokemonSpriteSlugs,
  itemDisplayById,
  moveById,
  normalizeAlias,
  normalizeId,
  pokemonById,
  resolveMegaEvolution,
} from "@/lib/data/loaders";
import {
  DEFAULT_IV_SPREAD,
  EMPTY_STAT_SPREAD,
  applyStage,
  computeStats,
  statPointsToCalcEvs,
} from "@/lib/calc/stat-calc";
import { analyzeCommandStructure } from "@/lib/parser/command-structure";
import { joinTokenValues } from "@/lib/parser/tokenize";
import {
  ATTACKER_MODIFIER_MAP,
  DEFENDER_MODIFIER_MAP,
  buildCommonAbilities,
} from "@/lib/parser/grammar";
import { resolveMoveEntity } from "@/lib/parser/fuse-indexes";
import { inferDefaultAbility } from "@/lib/parser/inference";
import { createImportedSet } from "@/lib/team/imported-set-utils";
import {
  getCanonicalSetReferenceToken,
  resolveReferencedImportedSet,
  resolveSetReferenceToken,
} from "@/lib/team/set-references";
import { useOmniStore } from "@/store/use-omni-store";
import { useTeamStore } from "@/store/use-team-store";
import { ImportSetModal } from "@/components/omnibar/import-set-modal";
import { PokemonSetEditorModal } from "@/components/omnibar/pokemon-set-editor-modal";
import type { ImportedSet, PokemonEntry, StatSpread } from "@/lib/types";

type SummarySide = "attacker" | "defender";
type StatKey = keyof StatSpread;
const STAT_LABELS: Array<[StatKey, string]> = [
  ["hp", "HP"],
  ["atk", "Atk"],
  ["def", "Def"],
  ["spa", "SpA"],
  ["spd", "SpD"],
  ["spe", "Spe"],
];

function resolveParsedSpecies(
  segment: ReturnType<typeof analyzeCommandStructure>["attacker"],
  importedSets: Record<string, ImportedSet>,
): PokemonEntry | null {
  const referenceSet = resolveSetReferenceToken(
    segment.leadingFreeTokens[0]?.raw,
    importedSets,
  );

  if (referenceSet && segment.leadingFreeTokens.length === 1) {
    return pokemonById.get(normalizeId(referenceSet.speciesId)) ?? null;
  }

  if (segment.speciesExact) {
    return segment.speciesExact.entry;
  }
  if (segment.leadingRemainderTokens.length === 0) {
    return segment.speciesMatch?.entry ?? null;
  }
  return null;
}

function resolveMoveName(moveInput: string | undefined): string | null {
  if (!moveInput) return null;
  const exact = moveById.get(normalizeId(moveInput));
  if (exact) return exact.name;
  return resolveMoveEntity(moveInput.replace(/-/g, " "))?.entry.name ?? null;
}

function resolveAbilityDisplay(
  pokemon: PokemonEntry | null,
  explicitAbility: string | undefined,
): string | null {
  if (!pokemon) return null;
  if (explicitAbility) {
    const knownAbilities = buildCommonAbilities(undefined, pokemon.abilities);
    const normalized = normalizeAlias(explicitAbility);
    return (
      knownAbilities.find((a) => normalizeAlias(a) === normalized) ??
      explicitAbility
    );
  }
  return inferDefaultAbility(pokemon.id);
}

function getSpriteSources(pokemon: PokemonEntry) {
  return Array.from(
    new Set(
      getPokemonSpriteSlugs(pokemon)
        .slice(0, 8)
        .flatMap((slug) => [
          `https://play.pokemonshowdown.com/sprites/home/${slug}.png`,
          `https://play.pokemonshowdown.com/sprites/dex/${slug}.png`,
          `https://play.pokemonshowdown.com/sprites/gen5/${slug}.png`,
          `https://img.pokemondb.net/sprites/home/normal/${slug}.png`,
          `https://img.pokemondb.net/artwork/large/${slug}.jpg`,
        ]),
    ),
  );
}

function getStageValue(
  tokens: ReturnType<
    typeof analyzeCommandStructure
  >["attacker"]["modifierTokens"],
  map: typeof ATTACKER_MODIFIER_MAP,
  kind: "stat_mod" | "speed_mod",
): number {
  return Math.max(
    -6,
    Math.min(
      6,
      tokens.reduce((sum, token) => {
        const def = map.get(token.value);
        return def?.kind === kind ? sum + (def.statMod ?? 0) : sum;
      }, 0),
    ),
  );
}

interface ItemStatBoosts {
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

function getItemStatBoosts(
  itemName: string | null | undefined,
): ItemStatBoosts {
  if (!itemName) return { atk: 1, def: 1, spa: 1, spd: 1, spe: 1 };
  const id = normalizeId(itemName);
  if (id === "choiceband") return { atk: 1.5, def: 1, spa: 1, spd: 1, spe: 1 };
  if (id === "choicespecs") return { atk: 1, def: 1, spa: 1.5, spd: 1, spe: 1 };
  if (id === "choicescarf") return { atk: 1, def: 1, spa: 1, spd: 1, spe: 1.5 };
  if (id === "assaultvest") return { atk: 1, def: 1, spa: 1, spd: 1.5, spe: 1 };
  return { atk: 1, def: 1, spa: 1, spd: 1, spe: 1 };
}

function buildEffectiveSetPreview(
  importedSet: ImportedSet | null,
  statPoints: StatSpread | undefined,
  nature: string | undefined,
) {
  const effectiveStatPoints =
    statPoints ?? importedSet?.statPoints ?? EMPTY_STAT_SPREAD;
  const effectiveNature = nature ?? importedSet?.nature ?? "Hardy";

  return {
    statPoints: effectiveStatPoints,
    evs: statPointsToCalcEvs(effectiveStatPoints),
    ivs: { ...DEFAULT_IV_SPREAD },
    nature: effectiveNature,
  };
}

function PokemonSprite({ sources, name }: { sources: string[]; name: string }) {
  const [spriteIndex, setSpriteIndex] = useState(0);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sources[spriteIndex]}
      alt={name}
      width={72}
      height={72}
      loading="lazy"
      className="h-18 w-18 object-contain"
      style={{ imageRendering: "pixelated" }}
      onError={() => {
        setSpriteIndex((current) =>
          current < sources.length - 1 ? current + 1 : current,
        );
      }}
    />
  );
}

interface StatItemProps {
  label: string;
  value: number;
  stage?: number;
  itemMultiplier?: number;
}

function StatItem({
  label,
  value,
  stage = 0,
  itemMultiplier = 1,
}: StatItemProps) {
  const stageEffective = applyStage(value, stage);
  const effective =
    itemMultiplier !== 1
      ? Math.floor(stageEffective * itemMultiplier)
      : stageEffective;
  const isBoosted = stage > 0 || itemMultiplier > 1;
  const isNerfed = stage < 0;

  return (
    <div className="flex items-baseline gap-1.5">
      <span className="theme-text-faint text-[10px] font-semibold uppercase tracking-[0.18em]">
        {label}
      </span>
      <span
        className="font-mono text-sm"
        style={{
          color: isBoosted
            ? "var(--accent-strong)"
            : isNerfed
              ? "var(--text-dim)"
              : "var(--text)",
        }}
      >
        {effective}
      </span>
      {stage !== 0 && (
        <span
          className="font-mono text-[9px]"
          style={{
            color: isBoosted ? "var(--accent-strong)" : "var(--text-dim)",
          }}
        >
          {stage > 0 ? `+${stage}` : `${stage}`}
        </span>
      )}
      {itemMultiplier !== 1 && (
        <span
          className="font-mono text-[9px]"
          style={{ color: "var(--accent-strong)" }}
        >
          ×{itemMultiplier}
        </span>
      )}
    </div>
  );
}

interface MoveChipProps {
  moveName: string;
  isActive?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

function MoveChip({ moveName, isActive, onClick, disabled }: MoveChipProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`truncate rounded-lg px-2.5 py-1 text-xs transition-colors ${
        isActive
          ? "theme-chip-active"
          : disabled
            ? "theme-chip-disabled cursor-default"
            : "theme-pill-muted cursor-pointer"
      }`}
    >
      {moveName}
    </button>
  );
}

function rebuildInputWithSpecies(
  input: string,
  side: SummarySide,
  targetPokemon: PokemonEntry,
) {
  const structure = analyzeCommandStructure(input);
  const globalTokens = structure.globalTokens.map((token) => token.raw);
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
      ? getCanonicalPromptPokemonName(targetPokemon)
      : (
          structure.attacker.speciesText ||
          joinTokenValues(structure.attacker.rawTokens)
        ).trim();
  const defenderSpecies =
    side === "defender"
      ? getCanonicalPromptPokemonName(targetPokemon)
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

  return [attackerText, "x", defenderText, ...globalTokens]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function buildStatPointsToken(statPoints: StatSpread) {
  return `sp:${statPoints.hp}/${statPoints.atk}/${statPoints.def}/${statPoints.spa}/${statPoints.spd}/${statPoints.spe}`;
}

function rebuildInputWithStatPoints(
  input: string,
  side: SummarySide,
  nextStatPoints: StatSpread,
  persistExplicitToken: boolean,
) {
  const structure = analyzeCommandStructure(input);
  const nextToken = buildStatPointsToken(nextStatPoints);
  const shouldIncludeToken =
    persistExplicitToken ||
    Object.values(nextStatPoints).some((value) => value > 0);

  const rewriteSegmentTokens = (
    tokens: ReturnType<typeof analyzeCommandStructure>["attacker"]["rawTokens"],
  ) => {
    const nextTokens = tokens
      .filter((token) => !token.normalized.startsWith("sp:"))
      .map((token) => token.raw);

    if (!shouldIncludeToken) {
      return nextTokens;
    }

    const firstGlobalTokenIndex = nextTokens.findIndex((token) =>
      token.toLowerCase().startsWith("~"),
    );

    if (firstGlobalTokenIndex === -1) {
      nextTokens.push(nextToken);
    } else {
      nextTokens.splice(firstGlobalTokenIndex, 0, nextToken);
    }

    return nextTokens;
  };

  const attackerTokens =
    side === "attacker"
      ? rewriteSegmentTokens(structure.attacker.rawTokens)
      : structure.attacker.rawTokens.map((token) => token.raw);
  const defenderTokens =
    side === "defender"
      ? rewriteSegmentTokens(structure.defender.rawTokens)
      : structure.defender.rawTokens.map((token) => token.raw);

  if (!structure.lexed.hasDelimiter) {
    return attackerTokens.join(" ").trim();
  }

  return [attackerTokens.join(" ").trim(), "x", defenderTokens.join(" ").trim()]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export function PokemonSideSummary({ side }: { side: SummarySide }) {
  const { input, parsedCommand, setAttackerMove, setInput, recompute } =
    useOmniStore(
      useShallow((state) => ({
        input: state.input,
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
  const [draftEntry, setDraftEntry] = useState<{
    stat: StatKey;
    value: string;
  } | null>(null);
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
    setInput(rebuildInputWithSpecies(input, side, targetPokemon));
  };

  const summary = useMemo(() => {
    const structure = analyzeCommandStructure(input);

    const attackerPromptSpecies = resolveParsedSpecies(
      structure.attacker,
      importedSets,
    );
    const defenderPromptSpecies = resolveParsedSpecies(
      structure.defender,
      importedSets,
    );
    const attackerReferenceSet = resolveSetReferenceToken(
      structure.attacker.leadingFreeTokens[0]?.raw,
      importedSets,
    );
    const defenderReferenceSet = resolveSetReferenceToken(
      structure.defender.leadingFreeTokens[0]?.raw,
      importedSets,
    );
    const attackerImportedSet =
      resolveReferencedImportedSet(
        parsedCommand?.attackerSetReferenceId,
        importedSets,
      ) ?? attackerReferenceSet;
    const defenderImportedSet =
      resolveReferencedImportedSet(
        parsedCommand?.defenderSetReferenceId,
        importedSets,
      ) ?? defenderReferenceSet;
    const promptStatPoints =
      side === "attacker"
        ? parsedCommand?.attackerStatPoints
        : parsedCommand?.defenderStatPoints;
    const effectivePromptStatPoints =
      promptStatPoints &&
      pendingStatPoints &&
      STAT_LABELS.every(
        ([key]) => promptStatPoints[key] === pendingStatPoints[key],
      )
        ? promptStatPoints
        : (pendingStatPoints ?? promptStatPoints);

    // Stage values
    const attackerStatStage = getStageValue(
      structure.attacker.modifierTokens,
      ATTACKER_MODIFIER_MAP,
      "stat_mod",
    );
    const attackerSpeedStage = getStageValue(
      structure.attacker.modifierTokens,
      ATTACKER_MODIFIER_MAP,
      "speed_mod",
    );
    const defenderStatStage = getStageValue(
      structure.defender.modifierTokens,
      DEFENDER_MODIFIER_MAP,
      "stat_mod",
    );
    const defenderSpeedStage = getStageValue(
      structure.defender.modifierTokens,
      DEFENDER_MODIFIER_MAP,
      "speed_mod",
    );

    // Move resolution
    const moveSlug = structure.attacker.moveToken?.value;
    const moveName = resolveMoveName(moveSlug);
    const moveEntry = moveSlug
      ? (moveById.get(normalizeId(moveSlug)) ??
        resolveMoveEntity(moveSlug.replace(/-/g, " "))?.entry ??
        null)
      : null;
    const moveCategory = moveEntry?.category ?? null;

    const attackerItemDisplay = structure.attacker.itemToken?.value
      ? (itemDisplayById.get(normalizeId(structure.attacker.itemToken.value)) ??
        structure.attacker.itemToken.value)
      : null;
    const defenderItemDisplay = structure.defender.itemToken?.value
      ? (itemDisplayById.get(normalizeId(structure.defender.itemToken.value)) ??
        structure.defender.itemToken.value)
      : null;
    const attackerItemName =
      parsedCommand?.attackerItem ??
      attackerItemDisplay ??
      attackerImportedSet?.item ??
      null;
    const defenderItemName =
      parsedCommand?.defenderItem ??
      defenderItemDisplay ??
      defenderImportedSet?.item ??
      null;
    const attacker = attackerPromptSpecies;
    const defender = defenderPromptSpecies;
    const resolvedAttackerSet = attackerImportedSet;
    const resolvedDefenderSet = defenderImportedSet;

    if (side === "attacker") {
      if (!attacker) return null;
      const importedSet = resolvedAttackerSet;
      const effectiveSet = buildEffectiveSetPreview(
        importedSet,
        effectivePromptStatPoints,
        parsedCommand?.attackerNature,
      );
      const hasCustomStats = Boolean(importedSet || effectivePromptStatPoints);
      const stats = hasCustomStats
        ? computeStats(
            attacker.baseStats,
            effectiveSet.evs,
            effectiveSet.ivs,
            effectiveSet.nature,
            importedSet?.level ?? 50,
          )
        : attacker.baseStats;

      // Determine per-stat stage boost based on move category
      const atkStage = moveCategory === "Special" ? 0 : attackerStatStage;
      const spaStage = moveCategory === "Physical" ? 0 : attackerStatStage;

      const attackerChoiceBoosts = getItemStatBoosts(attackerItemName);
      const megaTarget = attackerPromptSpecies?.isMega
        ? attackerPromptSpecies.baseSpeciesId
          ? (pokemonById.get(attackerPromptSpecies.baseSpeciesId) ?? null)
          : null
        : attackerPromptSpecies
          ? resolveMegaEvolution(
              attackerPromptSpecies.id,
              attackerItemName ?? undefined,
            )
          : null;

      return {
        title: "Attacker",
        name: attacker.name,
        pokemonId: attacker.id,
        promptPokemonId: attackerPromptSpecies?.id ?? attacker.id,
        spriteSources: getSpriteSources(attacker),
        ability: resolveAbilityDisplay(
          attacker,
          parsedCommand?.attackerAbility ??
            structure.attacker.abilityToken?.value,
        ),
        move: parsedCommand?.move ?? moveName,
        activeMoveEntry: moveEntry,
        item: attackerItemName,
        nature: effectiveSet.nature,
        stats,
        isBaseStats: !hasCustomStats,
        importedSet,
        promptStatPoints: effectivePromptStatPoints,
        effectiveStatPoints: effectiveSet.statPoints,
        megaTarget,
        stageBoosts: {
          hp: 0,
          atk: atkStage,
          def: 0,
          spa: spaStage,
          spd: 0,
          spe: attackerSpeedStage,
        },
        itemBoosts: attackerChoiceBoosts,
      };
    }

    // Defender side
    if (!defender) return null;
    const importedSet = resolvedDefenderSet;
    const effectiveSet = buildEffectiveSetPreview(
      importedSet,
      effectivePromptStatPoints,
      parsedCommand?.defenderNature,
    );
    const hasCustomStats = Boolean(importedSet || effectivePromptStatPoints);
    const stats = hasCustomStats
      ? computeStats(
          defender.baseStats,
          effectiveSet.evs,
          effectiveSet.ivs,
          effectiveSet.nature,
          importedSet?.level ?? 50,
        )
      : defender.baseStats;

    const defStage = moveCategory === "Special" ? 0 : defenderStatStage;
    const spdStage = moveCategory === "Physical" ? 0 : defenderStatStage;

    const defenderChoiceBoosts = getItemStatBoosts(defenderItemName);
    const megaTarget = defenderPromptSpecies?.isMega
      ? defenderPromptSpecies.baseSpeciesId
        ? (pokemonById.get(defenderPromptSpecies.baseSpeciesId) ?? null)
        : null
      : defenderPromptSpecies
        ? resolveMegaEvolution(
            defenderPromptSpecies.id,
            defenderItemName ?? undefined,
          )
        : null;

    return {
      title: "Defender",
      name: defender.name,
      pokemonId: defender.id,
      promptPokemonId: defenderPromptSpecies?.id ?? defender.id,
      spriteSources: getSpriteSources(defender),
      ability: resolveAbilityDisplay(
        defender,
        parsedCommand?.defenderAbility ??
          structure.defender.abilityToken?.value,
      ),
      move: null,
      activeMoveEntry: null,
      item: defenderItemName,
      nature: effectiveSet.nature,
      stats,
      isBaseStats: !hasCustomStats,
      importedSet,
      promptStatPoints: effectivePromptStatPoints,
      effectiveStatPoints: effectiveSet.statPoints,
      megaTarget,
      stageBoosts: {
        hp: 0,
        atk: 0,
        def: defStage,
        spa: 0,
        spd: spdStage,
        spe: defenderSpeedStage,
      },
      itemBoosts: defenderChoiceBoosts,
    };
  }, [input, side, importedSets, parsedCommand, pendingStatPoints]);

  const commitDraft = (stat: StatKey, raw: string) => {
    const parsed = Number(raw);
    updateInlineStatPoint(stat, Number.isFinite(parsed) ? parsed : 0);
    setDraftEntry(null);
  };

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

  if (!summary) {
    const importedSetList = Object.values(importedSets);

    return (
      <aside
        data-testid={`${side}-summary`}
        className="theme-panel rounded-[28px] p-5"
      >
        <div className="theme-text-faint text-xs font-semibold uppercase tracking-[0.24em]">
          {side}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="theme-subpanel-strong flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl p-2">
            <div className="theme-text-faint font-mono text-xs uppercase tracking-[0.2em]">
              —
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-lg font-medium capitalize">{side}</div>
            <div className="theme-text-dim mt-1 text-sm">
              Resolve this Pokémon to show ability, item, move context, and
              battle stats.
            </div>
          </div>
        </div>

        {importedSetList.length > 0 ? (
          <>
            <div className="theme-text-dim mt-4 mb-2 text-[11px] font-semibold uppercase tracking-[0.22em]">
              Saved Sets
            </div>
            <div className="space-y-1.5">
              {importedSetList.map((set) => (
                <div key={set.speciesId} className="group relative">
                  <button
                    type="button"
                    onClick={() => handleSelectSet(set)}
                    className="theme-subpanel w-full rounded-2xl px-3 py-2.5 pr-8 text-left transition-colors"
                  >
                    <div className="text-xs font-medium">
                      {set.nickname ?? set.speciesName}
                    </div>
                    {set.nickname ? (
                      <div className="theme-text-faint mt-0.5 truncate text-[10px]">
                        {set.speciesName}
                      </div>
                    ) : null}
                    {(set.item || set.ability) && (
                      <div className="theme-text-faint mt-0.5 truncate text-[10px]">
                        {[set.item, set.ability].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${set.speciesName}`}
                    onClick={() => handleRemoveSet(set.speciesId)}
                    className="theme-icon-button absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-sm opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="theme-chip mt-2 w-full rounded-2xl py-2 text-xs"
            >
              Import / Edit Team
            </button>
          </>
        ) : (
          <>
            <div className="theme-text-dim mt-3 text-sm">
              Resolve the {side} Pokémon to show a quick summary.
            </div>
            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="theme-chip mt-4 w-full rounded-2xl py-2.5 text-xs"
            >
              Import Set
            </button>
          </>
        )}

        {importModalOpen && (
          <ImportSetModal onClose={() => setImportModalOpen(false)} />
        )}
      </aside>
    );
  }

  const { importedSet, stageBoosts, itemBoosts } = summary;

  return (
    <aside
      data-testid={`${side}-summary`}
      className="theme-panel rounded-[28px] p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="theme-text-faint text-xs font-semibold uppercase tracking-[0.24em]">
          {summary.title}
        </div>
        {summary.megaTarget && (
          <button
            type="button"
            onClick={() => handleSwitchToMegaForm(summary.megaTarget!)}
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
        )}
      </div>

      {/* Sprite + info row */}
      <div className="mt-3 flex items-center gap-3">
        <div className="theme-subpanel-strong flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl p-2">
          <PokemonSprite
            key={summary.name}
            sources={summary.spriteSources}
            name={summary.name}
          />
        </div>
        <div className="min-w-0">
          <div className="truncate text-lg font-medium">{summary.name}</div>
          <div className="theme-text-dim mt-1 text-sm">
            Ability:{" "}
            <span className="theme-text-muted">{summary.ability ?? "—"}</span>
          </div>
          {summary.item && (
            <div className="theme-text-dim mt-0.5 text-sm">
              Item: <span className="theme-text-muted">{summary.item}</span>
            </div>
          )}
          {side === "attacker" && summary.move && (
            <div className="theme-text-dim mt-0.5 text-sm">
              Move: <span className="theme-text-muted">{summary.move}</span>
            </div>
          )}
          {importedSet && (
            <div className="theme-text-dim mt-0.5 text-xs">
              {importedSet.nature}
            </div>
          )}
        </div>
      </div>

      {/* Move chips from imported set */}
      {importedSet && (importedSet.moves ?? []).length > 0 && (
        <div className="mt-3">
          <div className="theme-text-faint mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em]">
            Moves
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(importedSet.moves ?? []).map((moveName) => {
              const resolvedEntry =
                moveById.get(normalizeId(moveName)) ??
                resolveMoveEntity(moveName)?.entry ??
                null;
              const isActive =
                summary.activeMoveEntry !== null &&
                resolvedEntry !== null &&
                resolvedEntry.id === summary.activeMoveEntry.id;

              return (
                <MoveChip
                  key={moveName}
                  moveName={moveName}
                  isActive={isActive}
                  disabled={side !== "attacker"}
                  onClick={
                    side === "attacker"
                      ? () => setAttackerMove(moveName)
                      : undefined
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      {/* SP spread */}
      <div className="mt-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="theme-text-faint text-[10px] font-semibold uppercase tracking-[0.18em]">
            SP Spread
          </div>
          <div className="theme-pill-muted rounded-full px-2 py-0.5 text-[10px] font-medium">
            <span className="theme-text-dim">
              {`${Math.max(
                0,
                66 -
                  STAT_LABELS.reduce(
                    (total, [key]) => total + summary.effectiveStatPoints[key],
                    0,
                  ),
              )} SP left`}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {STAT_LABELS.map(([statKey, label]) => {
            const value = summary.effectiveStatPoints[statKey];
            const currentStatPoints =
              pendingStatPoints ??
              summary.promptStatPoints ??
              summary.effectiveStatPoints;
            const maxValue = Math.max(
              0,
              Math.min(
                32,
                66 -
                  STAT_LABELS.reduce(
                    (total, [key]) =>
                      total + (key === statKey ? 0 : currentStatPoints[key]),
                    0,
                  ),
              ),
            );
            const decrementDisabled = value <= 0;
            const incrementDisabled = value >= maxValue;

            return (
              <div
                key={statKey}
                className="flex w-full flex-col items-center text-center font-mono"
              >
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={`Increase ${label} SP`}
                  disabled={incrementDisabled}
                  onClick={() => {
                    setDraftEntry(null);
                    updateInlineStatPoint(statKey, value + 1);
                  }}
                  className="flex h-2.5 w-full items-center justify-center rounded-sm text-[8px] leading-none disabled:opacity-25"
                  style={{ color: "var(--text-dim)" }}
                >
                  ▲
                </button>
                <div className="theme-pill-muted mt-0.5 flex min-w-0 flex-col items-center justify-center rounded-xl px-1.5 py-1">
                  <div className="flex w-full items-center justify-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      aria-label={`${label} SP`}
                      value={
                        draftEntry?.stat === statKey
                          ? draftEntry.value
                          : String(value)
                      }
                      onFocus={(e) => {
                        const el = e.currentTarget;
                        setDraftEntry({ stat: statKey, value: String(value) });
                        requestAnimationFrame(() => el.select());
                      }}
                      onChange={(e) => {
                        if (draftEntry?.stat === statKey) {
                          setDraftEntry({
                            stat: statKey,
                            value: e.currentTarget.value,
                          });
                        }
                      }}
                      onBlur={() => {
                        if (draftEntry?.stat === statKey) {
                          commitDraft(statKey, draftEntry.value);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (draftEntry?.stat === statKey) {
                            commitDraft(statKey, draftEntry.value);
                          }
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setDraftEntry(null);
                        }
                        if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setDraftEntry(null);
                          updateInlineStatPoint(statKey, value + 1);
                        }
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setDraftEntry(null);
                          updateInlineStatPoint(statKey, value - 1);
                        }
                      }}
                      className="w-full min-w-0 appearance-none bg-transparent text-center text-[11px] leading-none font-semibold outline-none"
                      style={{ color: "var(--text)" }}
                    />
                  </div>
                  <span
                    className="mt-1 text-[9px] leading-none"
                    style={{ color: "var(--text-dim)" }}
                  >
                    {label}
                  </span>
                </div>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={`Decrease ${label} SP`}
                  disabled={decrementDisabled}
                  onClick={() => {
                    setDraftEntry(null);
                    updateInlineStatPoint(statKey, value - 1);
                  }}
                  className="mt-0.5 flex h-2.5 w-full items-center justify-center rounded-sm text-[8px] leading-none disabled:opacity-25"
                  style={{ color: "var(--text-dim)" }}
                >
                  ▼
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats grid */}
      <div className="theme-divider mt-4 border-t pt-3">
        <div className="mb-2">
          <span className="theme-text-faint text-[10px] font-semibold uppercase tracking-[0.18em]">
            {importedSet || summary.promptStatPoints
              ? `Stats · Lv. ${importedSet?.level ?? 50}`
              : "Base Stats"}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
          <StatItem
            label="HP"
            value={summary.stats.hp}
            stage={stageBoosts.hp}
          />
          <StatItem
            label="Atk"
            value={summary.stats.atk}
            stage={stageBoosts.atk}
            itemMultiplier={itemBoosts.atk}
          />
          <StatItem
            label="Def"
            value={summary.stats.def}
            stage={stageBoosts.def}
            itemMultiplier={itemBoosts.def}
          />
          <StatItem
            label="SpA"
            value={summary.stats.spa}
            stage={stageBoosts.spa}
            itemMultiplier={itemBoosts.spa}
          />
          <StatItem
            label="SpD"
            value={summary.stats.spd}
            stage={stageBoosts.spd}
            itemMultiplier={itemBoosts.spd}
          />
          <StatItem
            label="Spe"
            value={summary.stats.spe}
            stage={stageBoosts.spe}
            itemMultiplier={itemBoosts.spe}
          />
        </div>
      </div>

      {/* Import / Remove section */}
      <div className="theme-divider mt-3 border-t pt-3">
        {importedSet ? (
          <div className="flex items-center justify-between gap-2">
            {otherSets.length > 0 ? (
              <div className="relative" ref={switchRef}>
                <button
                  type="button"
                  onClick={() => setSwitchOpen((o) => !o)}
                  className="theme-chip flex items-center gap-1 rounded-full px-3 py-1 text-xs"
                >
                  Switch
                  <span className="text-[9px] leading-none">
                    {switchOpen ? "▲" : "▼"}
                  </span>
                </button>
                {switchOpen && (
                  <div className="theme-menu absolute right-0 bottom-full z-30 mb-1.5 min-w-40 overflow-hidden rounded-2xl p-1">
                    {otherSets.map((s) => (
                      <button
                        key={s.speciesId}
                        type="button"
                        onClick={() => {
                          handleSelectSet(s);
                          setSwitchOpen(false);
                        }}
                        className="theme-menu-item w-full rounded-xl px-3 py-2 text-left"
                      >
                        <div className="text-xs font-medium">
                          {s.nickname ?? s.speciesName}
                        </div>
                        {s.nickname ? (
                          <div className="theme-text-faint mt-0.5 text-[10px]">
                            {s.speciesName}
                          </div>
                        ) : null}
                        {(s.item || s.ability) && (
                          <div className="theme-text-faint mt-0.5 text-[10px]">
                            {[s.item, s.ability].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditorOpen(true)}
                className="theme-chip rounded-full px-3 py-1 text-xs"
              >
                Edit
              </button>
              {resolvedSetId && (
                <button
                  type="button"
                  onClick={() => handleRemoveSet(resolvedSetId)}
                  className="theme-chip rounded-full px-3 py-1 text-xs"
                  style={{ color: "var(--accent-text-mid)" }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setEditorOpen(true)}
              className="theme-chip w-full rounded-2xl py-2 text-xs"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="theme-chip w-full rounded-2xl py-2 text-xs"
            >
              Import Set
            </button>
          </div>
        )}
      </div>

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
