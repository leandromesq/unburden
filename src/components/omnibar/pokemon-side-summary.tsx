"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  EMPTY_STAT_SPREAD,
  applyStage,
  computeStats,
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
import { createImportedSet, resolveImportedSet } from "@/lib/team/imported-set-utils";
import { useOmniStore } from "@/store/use-omni-store";
import { useTeamStore } from "@/store/use-team-store";
import { ImportSetModal } from "@/components/omnibar/import-set-modal";
import { PokemonSetEditorModal } from "@/components/omnibar/pokemon-set-editor-modal";
import type { PokemonEntry } from "@/lib/types";

type SummarySide = "attacker" | "defender";

function resolveParsedSpecies(
  segment: ReturnType<typeof analyzeCommandStructure>["attacker"],
): PokemonEntry | null {
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
      tabIndex={-1}
      disabled={disabled}
      onClick={onClick}
      className={`truncate rounded-lg px-2.5 py-1 text-xs transition-colors ${
        isActive
          ? "theme-chip-active"
          : disabled
            ? "theme-chip-disabled cursor-default"
            : "theme-chip cursor-pointer"
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
  const attackerSpecies = side === "attacker"
    ? getCanonicalPromptPokemonName(targetPokemon)
    : (structure.attacker.speciesText || joinTokenValues(structure.attacker.rawTokens)).trim();
  const defenderSpecies = side === "defender"
    ? getCanonicalPromptPokemonName(targetPokemon)
    : (structure.defender.speciesText || joinTokenValues(structure.defender.rawTokens)).trim();
  const attackerText = [attackerSpecies, attackerTail].filter(Boolean).join(" ").trim();
  const defenderText = [defenderSpecies, defenderTail].filter(Boolean).join(" ").trim();

  if (!structure.lexed.hasDelimiter) {
    return attackerText;
  }

  return [attackerText, "x", defenderText].filter(Boolean).join(" ").trim();
}

export function PokemonSideSummary({ side }: { side: SummarySide }) {
  const input = useOmniStore((state) => state.input);
  const setAttackerMove = useOmniStore((state) => state.setAttackerMove);
  const setInput = useOmniStore((state) => state.setInput);
  const recompute = useOmniStore((state) => state.recompute);
  const importedSets = useTeamStore((state) => state.importedSets);
  const removeSet = useTeamStore((state) => state.removeSet);
  const saveSet = useTeamStore((state) => state.saveSet);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const switchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    useTeamStore.getState().hydrate();
  }, []);

  // Close the switch dropdown when clicking outside it
  useEffect(() => {
    if (!switchOpen) return;
    const handler = (e: MouseEvent) => {
      if (switchRef.current && !switchRef.current.contains(e.target as Node)) {
        setSwitchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [switchOpen]);

  const handleSelectSet = (speciesName: string) => {
    const structure = analyzeCommandStructure(input);
    if (side === "attacker") {
      const defenderPart = structure.lexed.hasDelimiter
        ? " x " + structure.defender.rawTokens.map((t) => t.raw).join(" ")
        : "";
      setInput((speciesName + defenderPart).trim());
    } else {
      const attackerPart = structure.attacker.rawTokens
        .map((t) => t.raw)
        .join(" ")
        .trim();
      if (attackerPart) {
        setInput((attackerPart + " x " + speciesName).trim());
      } else {
        setInput(speciesName);
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

    const attackerPromptSpecies = resolveParsedSpecies(structure.attacker);
    const defenderPromptSpecies = resolveParsedSpecies(structure.defender);
    const attackerSet = attackerPromptSpecies
      ? resolveImportedSet(attackerPromptSpecies, importedSets)
      : null;
    const defenderSet = defenderPromptSpecies
      ? resolveImportedSet(defenderPromptSpecies, importedSets)
      : null;

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
    const attackerItemName = attackerItemDisplay ?? attackerSet?.item ?? null;
    const defenderItemName = defenderItemDisplay ?? defenderSet?.item ?? null;
    const attacker = attackerPromptSpecies;
    const defender = defenderPromptSpecies;
    const resolvedAttackerSet = attacker ? resolveImportedSet(attacker, importedSets) : null;
    const resolvedDefenderSet = defender ? resolveImportedSet(defender, importedSets) : null;

    if (side === "attacker") {
      if (!attacker) return null;
      const importedSet = resolvedAttackerSet;
      const stats = importedSet
        ? computeStats(
            attacker.baseStats,
            importedSet.evs,
            importedSet.ivs,
            importedSet.nature,
            importedSet.level,
          )
        : attacker.baseStats;

      // Determine per-stat stage boost based on move category
      const atkStage = moveCategory === "Special" ? 0 : attackerStatStage;
      const spaStage = moveCategory === "Physical" ? 0 : attackerStatStage;

      const attackerChoiceBoosts = getItemStatBoosts(attackerItemName);
      const megaTarget = attackerPromptSpecies?.isMega
        ? (attackerPromptSpecies.baseSpeciesId
            ? pokemonById.get(attackerPromptSpecies.baseSpeciesId) ?? null
            : null)
        : attackerPromptSpecies
          ? resolveMegaEvolution(attackerPromptSpecies.id, attackerItemName ?? undefined)
          : null;

      return {
        title: "Attacker",
        name: attacker.name,
        pokemonId: attacker.id,
        promptPokemonId: attackerPromptSpecies?.id ?? attacker.id,
        spriteSources: getSpriteSources(attacker),
        ability: resolveAbilityDisplay(
          attacker,
          structure.attacker.abilityToken?.value,
        ),
        move: moveName,
        activeMoveEntry: moveEntry,
        item: attackerItemName,
        nature: importedSet?.nature ?? "Hardy",
        stats,
        isBaseStats: !importedSet,
        importedSet,
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
    const stats = importedSet
      ? computeStats(
          defender.baseStats,
          importedSet.evs,
          importedSet.ivs,
          importedSet.nature,
          importedSet.level,
        )
      : defender.baseStats;

    const defStage = moveCategory === "Special" ? 0 : defenderStatStage;
    const spdStage = moveCategory === "Physical" ? 0 : defenderStatStage;

    const defenderChoiceBoosts = getItemStatBoosts(defenderItemName);
    const megaTarget = defenderPromptSpecies?.isMega
      ? (defenderPromptSpecies.baseSpeciesId
          ? pokemonById.get(defenderPromptSpecies.baseSpeciesId) ?? null
          : null)
      : defenderPromptSpecies
        ? resolveMegaEvolution(defenderPromptSpecies.id, defenderItemName ?? undefined)
        : null;

    return {
      title: "Defender",
      name: defender.name,
      pokemonId: defender.id,
      promptPokemonId: defenderPromptSpecies?.id ?? defender.id,
      spriteSources: getSpriteSources(defender),
      ability: resolveAbilityDisplay(
        defender,
        structure.defender.abilityToken?.value,
      ),
      move: null,
      activeMoveEntry: null,
      item: defenderItemName,
      nature: importedSet?.nature ?? "Hardy",
      stats,
      isBaseStats: !importedSet,
      importedSet,
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
  }, [input, side, importedSets]);

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

    if (summary.importedSet) {
      return summary.importedSet;
    }

    return createImportedSet({
      speciesId: summary.promptPokemonId,
      speciesName:
        pokemonById.get(summary.promptPokemonId)?.name ?? summary.name,
      item: summary.item ?? undefined,
      ability: summary.ability ?? undefined,
      nature: summary.nature,
      statPoints: EMPTY_STAT_SPREAD,
      moves: summary.move ? [summary.move] : [],
    });
  }, [summary]);

  if (!summary) {
    const importedSetList = Object.values(importedSets);

    return (
      <aside
        data-testid={`${side}-summary`}
        className="theme-panel rounded-3xl p-4"
      >
        <div className="theme-text-faint text-xs font-semibold uppercase tracking-[0.24em]">
          {side}
        </div>

        {importedSetList.length > 0 ? (
          <>
            <div className="theme-text-dim mt-3 mb-2 text-[11px] font-semibold uppercase tracking-[0.22em]">
              Saved Sets
            </div>
            <div className="space-y-1.5">
              {importedSetList.map((set) => (
                <div key={set.speciesId} className="group relative">
                  <button
                    type="button"
                    onClick={() => handleSelectSet(set.speciesName)}
                    className="theme-chip w-full rounded-xl px-3 py-2 pr-7 text-left"
                  >
                    <div className="text-xs font-medium">{set.speciesName}</div>
                    {(set.item || (set.moves ?? []).length > 0) && (
                      <div className="theme-text-faint mt-0.5 truncate text-[10px]">
                        {[set.item, (set.moves ?? []).slice(0, 2).join(" / ")]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={`Remove ${set.speciesName}`}
                    onClick={() => handleRemoveSet(set.speciesId)}
                    className="theme-text-faint absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-sm opacity-0 transition-opacity group-hover:opacity-100 hover:text-(--accent-strong)"
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
      className="theme-panel rounded-3xl p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="theme-text-faint text-xs font-semibold uppercase tracking-[0.24em]">
          {summary.title}
        </div>
        {summary.megaTarget && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => handleSwitchToMegaForm(summary.megaTarget!)}
            aria-label={summary.pokemonId === summary.megaTarget.id ? "Switch to base form" : "Switch to mega form"}
            title={summary.pokemonId === summary.megaTarget.id ? "Base form" : "Mega form"}
            className="theme-chip flex h-8 w-8 shrink-0 items-center justify-center rounded-full p-0 text-[11px] font-bold uppercase tracking-[0.08em]"
          >
            M
          </button>
        )}
      </div>

      {/* Sprite + info row */}
      <div className="mt-3 flex items-center gap-3">
        <div className="theme-subpanel flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl p-2">
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

      {/* SP spread (compact, when set is imported) */}
      {importedSet && (
        <div
          className="theme-subpanel mt-2 grid grid-cols-6 gap-1 rounded-xl border px-2 py-1.5 font-mono text-[11px] font-semibold"
          style={{ color: "var(--text-muted)" }}
        >
          {[
            ["HP", importedSet.statPoints.hp],
            ["Atk", importedSet.statPoints.atk],
            ["Def", importedSet.statPoints.def],
            ["SpA", importedSet.statPoints.spa],
            ["SpD", importedSet.statPoints.spd],
            ["Spe", importedSet.statPoints.spe],
          ].map(([label, value]) => (
            <div key={String(label)} className="min-w-0 whitespace-nowrap text-center">
              <span>{value}</span>{" "}
              <span className="text-[10px]">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats grid */}
      <div className="theme-divider mt-4 border-t pt-3">
        <div className="mb-2">
          <span className="theme-text-faint text-[10px] font-semibold uppercase tracking-[0.18em]">
            {importedSet ? `Stats · Lv. ${importedSet.level}` : "Base Stats"}
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
                  tabIndex={-1}
                  onClick={() => setSwitchOpen((o) => !o)}
                  className="theme-chip flex items-center gap-1 rounded-full px-3 py-1 text-xs"
                >
                  Switch
                  <span className="text-[9px] leading-none">
                    {switchOpen ? "▲" : "▼"}
                  </span>
                </button>
                {switchOpen && (
                  <div className="theme-panel absolute right-0 bottom-full z-30 mb-1.5 min-w-37 overflow-hidden rounded-2xl p-1 shadow-lg">
                    {otherSets.map((s) => (
                      <button
                        key={s.speciesId}
                        type="button"
                        tabIndex={-1}
                        onClick={() => {
                          handleSelectSet(s.speciesName);
                          setSwitchOpen(false);
                        }}
                        className="theme-chip w-full rounded-xl px-3 py-2 text-left"
                      >
                        <div className="text-xs font-medium">
                          {s.speciesName}
                        </div>
                        {s.item && (
                          <div className="theme-text-faint mt-0.5 text-[10px]">
                            {s.item}
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
                tabIndex={-1}
                onClick={() => setEditorOpen(true)}
                className="theme-chip rounded-full px-3 py-1 text-xs"
              >
                Edit
              </button>
              {resolvedSetId && (
                <button
                  type="button"
                  tabIndex={-1}
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
          <div
            className="grid gap-2 sm:grid-cols-2"
          >
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setEditorOpen(true)}
              className="theme-chip w-full rounded-2xl py-2 text-xs"
            >
              Edit
            </button>
            <button
              type="button"
              tabIndex={-1}
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
            const speciesChanged = editorInitialSet.speciesId !== nextSet.speciesId;
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
