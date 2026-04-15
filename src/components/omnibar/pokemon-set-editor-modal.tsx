"use client";

import { useMemo, useState } from "react";

import {
  MAX_STAT_POINTS,
  NATURE_MODIFIERS,
  sumStatPoints,
} from "@/lib/calc/stat-calc";
import {
  itemDisplayById,
  legalPokemonData,
  learnsetByPokemonId,
  moveById,
  normalizeId,
  pokemonById,
  vgcMetaByPokemonId,
} from "@/lib/data/loaders";
import { resolveExactPokemonEntity } from "@/lib/parser/fuse-indexes";
import { buildCommonAbilities } from "@/lib/parser/grammar";
import { createImportedSet } from "@/lib/team/imported-set-utils";
import { SearchableCombobox } from "@/components/omnibar/searchable-combobox";
import type { ImportedSet, StatSpread } from "@/lib/types";

const NATURES = [
  "Hardy",
  "Lonely",
  "Brave",
  "Adamant",
  "Naughty",
  "Bold",
  "Docile",
  "Relaxed",
  "Impish",
  "Lax",
  "Timid",
  "Hasty",
  "Serious",
  "Jolly",
  "Naive",
  "Modest",
  "Mild",
  "Quiet",
  "Bashful",
  "Rash",
  "Calm",
  "Gentle",
  "Sassy",
  "Careful",
  "Quirky",
];

const STAT_FIELDS: Array<[keyof StatSpread, string]> = [
  ["hp", "HP"],
  ["atk", "Atk"],
  ["def", "Def"],
  ["spa", "SpA"],
  ["spd", "SpD"],
  ["spe", "Spe"],
];

const STAT_LABEL_MAP: Record<string, string> = {
  atk: "Atk",
  def: "Def",
  spa: "SpA",
  spd: "SpD",
  spe: "Spe",
};

function getNatureDescription(nature: string): string {
  const mods = NATURE_MODIFIERS[nature];
  if (!mods) return "";
  const entries = Object.entries(mods) as Array<[string, number]>;
  const boosted = entries.find(([, v]) => v > 1);
  const lowered = entries.find(([, v]) => v < 1);
  if (!boosted && !lowered) return "";
  const parts = [
    boosted ? `+${STAT_LABEL_MAP[boosted[0]]}` : null,
    lowered ? `-${STAT_LABEL_MAP[lowered[0]]}` : null,
  ].filter(Boolean);
  return `(${parts.join("/")})`;
}

function renderNatureOption(option: string) {
  const desc = getNatureDescription(option);
  return (
    <span className="flex items-center justify-between gap-3">
      <span>{option}</span>
      {desc && <span className="theme-text-faint text-xs">{desc}</span>}
    </span>
  );
}

interface PokemonSetEditorModalProps {
  initialSet: ImportedSet;
  onClose: () => void;
  onSave: (set: ImportedSet) => void;
}

export function PokemonSetEditorModal({
  initialSet,
  onClose,
  onSave,
}: PokemonSetEditorModalProps) {
  const [speciesName, setSpeciesName] = useState(initialSet.speciesName);
  const [nickname, setNickname] = useState(initialSet.nickname ?? "");
  const [item, setItem] = useState(initialSet.item ?? "");
  const [ability, setAbility] = useState(initialSet.ability ?? "");
  const [nature, setNature] = useState(initialSet.nature);
  const [moves, setMoves] = useState(() => {
    const next = [...initialSet.moves];
    while (next.length < 4) {
      next.push("");
    }
    return next.slice(0, 4);
  });
  const [statPoints, setStatPoints] = useState(initialSet.statPoints);
  const resolvedSpecies = useMemo(
    () => resolveExactPokemonEntity(speciesName)?.entry ?? null,
    [speciesName],
  );
  const pokemon =
    resolvedSpecies ?? pokemonById.get(initialSet.speciesId) ?? null;
  const profile = pokemon ? vgcMetaByPokemonId.get(pokemon.id) : undefined;

  const totalStatPoints = useMemo(
    () => sumStatPoints(statPoints),
    [statPoints],
  );
  const isOverCap = totalStatPoints > MAX_STAT_POINTS;
  const speciesOptions = useMemo(
    () =>
      Array.from(
        new Set([
          initialSet.speciesName,
          ...legalPokemonData.map((entry) => entry.name),
        ]),
      ).sort((left, right) => left.localeCompare(right)),
    [initialSet.speciesName],
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
        new Set(buildCommonAbilities(profile, pokemon?.abilities ?? [])),
      ),
    [pokemon?.abilities, profile],
  );
  const moveOptions = useMemo(() => {
    const learnset = pokemon
      ? (learnsetByPokemonId.get(pokemon.id) ??
        (pokemon.baseSpeciesId
          ? learnsetByPokemonId.get(pokemon.baseSpeciesId)
          : undefined))
      : undefined;
    const prioritizedMoveIds = [
      profile?.defaultMove,
      ...(profile?.commonMoves ?? []),
      ...(learnset?.moveIds ?? []),
    ].filter(Boolean) as string[];

    return Array.from(
      new Set(
        prioritizedMoveIds
          .map((moveId) => moveById.get(normalizeId(moveId))?.name)
          .filter(Boolean) as string[],
      ),
    );
  }, [pokemon, profile]);
  const moveComboboxOptions = useMemo(
    () => Array.from(new Set([...moveOptions, ...moves.filter(Boolean)])),
    [moveOptions, moves],
  );

  const updateStatPoint = (key: keyof StatSpread, value: string) => {
    const parsed = Number(value);
    setStatPoints((current) => ({
      ...current,
      [key]: Number.isFinite(parsed)
        ? Math.max(0, Math.min(32, Math.round(parsed)))
        : 0,
    }));
  };

  const updateMove = (index: number, value: string) => {
    setMoves((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  };

  const handleSave = () => {
    if (!pokemon) {
      return;
    }

    const nextSet = createImportedSet({
      speciesId: pokemon.id,
      speciesName: pokemon.name,
      nickname: nickname.trim() || undefined,
      item: item.trim() || undefined,
      ability: ability.trim() || undefined,
      level: initialSet.level,
      nature,
      statPoints,
      ivs: initialSet.ivs,
      moves: moves.map((move) => move.trim()).filter(Boolean),
      teraType: initialSet.teraType,
    });

    onSave(nextSet);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${pokemon?.name ?? speciesName} set`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="theme-panel w-full max-w-2xl overflow-hidden rounded-3xl"
        style={{ boxShadow: "var(--shadow-overlay)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div>
            <h2 className="text-base font-semibold">Edit Set</h2>
            <p className="theme-text-dim mt-1 text-sm">
              {(pokemon?.name ?? speciesName).trim() || "Choose a Pokemon"} ·
              Champions SP spread
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="theme-icon-button -mr-1 flex h-8 w-8 items-center justify-center rounded-full text-xl font-light leading-none"
          >
            ×
          </button>
        </div>

        <div
          className="grid max-h-[75vh] gap-5 overflow-y-auto px-6 pb-6 lg:grid-cols-[minmax(0,1fr)_280px]"
          style={{ scrollbarGutter: "stable both-edges" }}
        >
          <div className="space-y-4">
            <SearchableCombobox
              label="Pokemon"
              value={speciesName}
              options={speciesOptions}
              placeholder="Politoed"
              onChange={setSpeciesName}
            />

            <label className="block">
              <span className="theme-text-dim mb-1.5 block text-sm">
                Set Name
              </span>
              <input
                type="text"
                value={nickname}
                onChange={(event) => setNickname(event.currentTarget.value)}
                placeholder="poli-rain"
                className="theme-control theme-input w-full rounded-2xl px-3 py-2.5"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <SearchableCombobox
                label="Item"
                value={item}
                options={itemOptions}
                placeholder="Leftovers"
                onChange={setItem}
              />
              <label className="block space-y-1 text-sm">
                <span className="theme-text-dim">Ability</span>
                <select
                  value={ability}
                  onChange={(event) => setAbility(event.currentTarget.value)}
                  className="theme-input w-full rounded-xl border px-3 py-2"
                  style={{
                    background: "var(--surface-3)",
                    borderColor: "var(--line-strong)",
                  }}
                >
                  {abilityOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block space-y-1 text-sm">
              <span className="theme-text-dim">Nature</span>
              <select
                value={nature}
                onChange={(event) => setNature(event.currentTarget.value)}
                className="theme-input w-full rounded-xl border px-3 py-2"
                style={{
                  background: "var(--surface-3)",
                  borderColor: "var(--line-strong)",
                }}
              >
                {NATURES.map((n) => {
                  const desc = getNatureDescription(n);
                  return (
                    <option key={n} value={n}>
                      {desc ? `${n} ${desc}` : n}
                    </option>
                  );
                })}
              </select>
            </label>

            <div className="space-y-2">
              <div className="theme-text-dim text-sm">Moves</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {moves.map((move, index) => (
                  <SearchableCombobox
                    key={index}
                    label={`Move ${index + 1}`}
                    hideLabel
                    value={move}
                    options={moveComboboxOptions}
                    placeholder={`Move ${index + 1}`}
                    onChange={(value) => updateMove(index, value)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="theme-subpanel rounded-2xl border p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">SPs</div>
              <div
                className="font-mono text-xs"
                style={{
                  color: isOverCap ? "var(--accent-strong)" : "var(--text-dim)",
                }}
              >
                {totalStatPoints} / {MAX_STAT_POINTS}
              </div>
            </div>
            <div className="mt-3 space-y-2.5">
              {STAT_FIELDS.map(([key, label]) => {
                const value = statPoints[key];
                const remaining = MAX_STAT_POINTS - totalStatPoints;
                const maxValue = Math.min(32, value + remaining);
                return (
                  <div
                    key={key}
                    className="theme-subpanel rounded-lg px-2.5 py-1.5"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="theme-text-faint font-mono text-[9px] font-semibold uppercase tracking-[0.12em]">
                        {label}
                      </span>
                      <span className="theme-text-dim font-mono text-[10px]">
                        {value} SP
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={32}
                      step={1}
                      value={value}
                      aria-label={`Set ${label} SP`}
                      onChange={(event) => {
                        const requested = Number(event.currentTarget.value);
                        updateStatPoint(
                          key,
                          String(Math.min(requested, maxValue)),
                        );
                      }}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full"
                      style={{
                        background: "var(--line-strong)",
                        accentColor: "var(--accent)",
                      }}
                    />
                  </div>
                );
              })}
            </div>
            {!resolvedSpecies && (
              <p
                className="mt-2 text-xs"
                style={{ color: "var(--accent-strong)" }}
              >
                Pick a valid Pokemon from the list before saving.
              </p>
            )}
          </div>
        </div>

        <div className="theme-divider flex items-center justify-end gap-2 border-t px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="theme-chip rounded-full px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isOverCap || !resolvedSpecies}
            className="theme-chip-active rounded-full px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
