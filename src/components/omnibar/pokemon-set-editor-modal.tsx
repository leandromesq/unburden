"use client";

import { useMemo, useState } from "react";

import {
  MAX_STAT_POINTS,
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
  const pokemon = resolvedSpecies ?? pokemonById.get(initialSet.speciesId) ?? null;
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
        new Set(
          buildCommonAbilities(profile, pokemon?.abilities ?? []),
        ),
      ),
    [pokemon?.abilities, profile],
  );
  const moveOptions = useMemo(() => {
    const learnset = pokemon
      ? (learnsetByPokemonId.get(pokemon.id)
      ?? (pokemon.baseSpeciesId
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
      nickname: initialSet.nickname,
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
              {(pokemon?.name ?? speciesName).trim() || "Choose a Pokemon"} · Champions SP spread
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="theme-text-dim -mr-1 flex h-8 w-8 items-center justify-center rounded-full text-xl font-light leading-none transition-colors hover:bg-(--surface-3)"
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

            <div className="grid gap-3 sm:grid-cols-2">
              <SearchableCombobox
                label="Item"
                value={item}
                options={itemOptions}
                placeholder="Mystic Water"
                onChange={setItem}
              />
              <SearchableCombobox
                label="Ability"
                value={ability}
                options={abilityOptions}
                placeholder="Drizzle"
                onChange={setAbility}
              />
            </div>

            <SearchableCombobox
              label="Nature"
              value={nature}
              options={NATURES}
              placeholder="Modest"
              onChange={setNature}
            />

            <div className="space-y-2">
              <div className="theme-text-dim text-sm">Moves</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {moves.map((move, index) => (
                  <SearchableCombobox
                    key={index}
                    label={`Move ${index + 1}`}
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
              {STAT_FIELDS.map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="theme-text-dim w-10 shrink-0">{label}</span>
                  <input
                    type="number"
                    min={0}
                    max={32}
                    value={statPoints[key]}
                    onChange={(event) => updateStatPoint(key, event.currentTarget.value)}
                    className="theme-input theme-panel w-20 rounded-xl border px-3 py-1.5 text-right font-mono"
                  />
                </label>
              ))}
            </div>
            <p className="theme-text-faint mt-3 text-xs leading-5">
              1 SP = 8 EVs. The editor stores SPs and derives calc EVs automatically.
            </p>
            {!resolvedSpecies && (
              <p className="mt-2 text-xs" style={{ color: "var(--accent-strong)" }}>
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
