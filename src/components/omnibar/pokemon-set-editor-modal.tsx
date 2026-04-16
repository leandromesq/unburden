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
import { SearchableCombobox } from "@/components/omnibar/searchable-combobox";
import { createImportedSet } from "@/lib/team/imported-set-utils";
import type { ImportedSet, StatSpread } from "@/lib/types";

const NATURES = [
  "Hardy",
  "Lonely",
  "Brave",
  "Adamant",
  "Naughty",
  "Bold",
  "Relaxed",
  "Impish",
  "Lax",
  "Timid",
  "Hasty",
  "Jolly",
  "Naive",
  "Modest",
  "Mild",
  "Quiet",
  "Rash",
  "Calm",
  "Gentle",
  "Sassy",
  "Careful",
] as const;

const STAT_FIELDS: Array<[keyof StatSpread, string]> = [
  ["hp", "HP"],
  ["atk", "Atk"],
  ["def", "Def"],
  ["spa", "SpA"],
  ["spd", "SpD"],
  ["spe", "Spe"],
];

const NON_HP_STATS: Array<keyof Omit<StatSpread, "hp">> = [
  "atk",
  "def",
  "spa",
  "spd",
  "spe",
];

const STAT_LABEL_MAP: Record<string, string> = {
  atk: "Atk",
  def: "Def",
  spa: "SpA",
  spd: "SpD",
  spe: "Spe",
};

const NATURE_BY_MARKERS: Record<string, string> = {
  "atk:def": "Lonely",
  "atk:spe": "Brave",
  "atk:spa": "Adamant",
  "atk:spd": "Naughty",
  "def:atk": "Bold",
  "def:spe": "Relaxed",
  "def:spa": "Impish",
  "def:spd": "Lax",
  "spe:atk": "Timid",
  "spe:def": "Hasty",
  "spe:spa": "Jolly",
  "spe:spd": "Naive",
  "spa:atk": "Modest",
  "spa:def": "Mild",
  "spa:spe": "Quiet",
  "spa:spd": "Rash",
  "spd:atk": "Calm",
  "spd:def": "Gentle",
  "spd:spe": "Sassy",
  "spd:spa": "Careful",
};

type NatureMarker = "+" | "-";
type NatureMarkerState = Partial<
  Record<keyof Omit<StatSpread, "hp">, NatureMarker>
>;
type StatInputDrafts = Record<keyof StatSpread, string>;

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

function buildNatureMarkerState(nature: string): NatureMarkerState {
  const pair = Object.entries(NATURE_BY_MARKERS).find(
    ([, mappedNature]) => mappedNature === nature,
  )?.[0];

  if (!pair) {
    return {};
  }

  const [boosted, lowered] = pair.split(":") as Array<
    keyof Omit<StatSpread, "hp">
  >;

  return {
    [boosted]: "+",
    [lowered]: "-",
  };
}

function resolveNatureFromMarkerState(markerState: NatureMarkerState): string {
  const boosted = NON_HP_STATS.find((stat) => markerState[stat] === "+");
  const lowered = NON_HP_STATS.find((stat) => markerState[stat] === "-");

  if (!boosted || !lowered) {
    return "Hardy";
  }

  return NATURE_BY_MARKERS[`${boosted}:${lowered}`] ?? "Hardy";
}

function buildStatInputDraft(
  stat: keyof StatSpread,
  statPoints: StatSpread,
  markerState: NatureMarkerState,
): string {
  if (stat === "hp") {
    return String(statPoints.hp);
  }

  const marker = markerState[stat as keyof Omit<StatSpread, "hp">] ?? "";
  return `${statPoints[stat]}${marker}`;
}

function buildStatInputDrafts(
  statPoints: StatSpread,
  markerState: NatureMarkerState,
): StatInputDrafts {
  return {
    hp: buildStatInputDraft("hp", statPoints, markerState),
    atk: buildStatInputDraft("atk", statPoints, markerState),
    def: buildStatInputDraft("def", statPoints, markerState),
    spa: buildStatInputDraft("spa", statPoints, markerState),
    spd: buildStatInputDraft("spd", statPoints, markerState),
    spe: buildStatInputDraft("spe", statPoints, markerState),
  };
}

function parseStatDraft(rawValue: string): {
  numericValue: number | null;
  marker: NatureMarker | null;
  isEmpty: boolean;
  isValid: boolean;
} {
  const trimmed = rawValue.trim();

  if (trimmed === "") {
    return {
      numericValue: null,
      marker: null,
      isEmpty: true,
      isValid: true,
    };
  }

  const markerMatch = trimmed.match(/[+-]$/);
  const marker = (markerMatch?.[0] as NatureMarker | undefined) ?? null;
  const numericPart = marker ? trimmed.slice(0, -1).trim() : trimmed;

  if (numericPart === "" && marker) {
    return {
      numericValue: 0,
      marker,
      isEmpty: false,
      isValid: true,
    };
  }

  if (!/^\d+$/.test(numericPart)) {
    return {
      numericValue: null,
      marker,
      isEmpty: false,
      isValid: false,
    };
  }

  return {
    numericValue: Number(numericPart),
    marker,
    isEmpty: false,
    isValid: true,
  };
}

function applyMarkerToState(
  currentState: NatureMarkerState,
  stat: keyof StatSpread,
  marker: NatureMarker | null,
): NatureMarkerState {
  if (stat === "hp") {
    return currentState;
  }

  const typedStat = stat as keyof Omit<StatSpread, "hp">;
  const nextState: NatureMarkerState = { ...currentState };

  delete nextState[typedStat];

  if (!marker) {
    return nextState;
  }

  for (const key of NON_HP_STATS) {
    if (key !== typedStat && nextState[key] === marker) {
      delete nextState[key];
    }
  }

  nextState[typedStat] = marker;
  return nextState;
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
  const [, setNatureMarkers] = useState<NatureMarkerState>(() =>
    buildNatureMarkerState(initialSet.nature),
  );
  const [statInputDrafts, setStatInputDrafts] = useState<StatInputDrafts>(() =>
    buildStatInputDrafts(
      initialSet.statPoints,
      buildNatureMarkerState(initialSet.nature),
    ),
  );

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

  const updateStatPoint = (key: keyof StatSpread, rawValue: string) => {
    setStatInputDrafts((current) => ({
      ...current,
      [key]: rawValue,
    }));

    const parsed = parseStatDraft(rawValue);
    if (!parsed.isValid) {
      return;
    }

    setNatureMarkers((currentMarkers) => {
      const nextMarkers = applyMarkerToState(
        currentMarkers,
        key,
        parsed.marker,
      );
      const nextNature = resolveNatureFromMarkerState(nextMarkers);

      setNature(nextNature);

      if (parsed.isEmpty) {
        const nextStatPoints = {
          ...statPoints,
          [key]: 0,
        };
        setStatPoints(nextStatPoints);
        setStatInputDrafts(buildStatInputDrafts(nextStatPoints, nextMarkers));
        return nextMarkers;
      }

      if (parsed.numericValue === null) {
        return nextMarkers;
      }

      const nextStatPoints = {
        ...statPoints,
        [key]: Math.max(0, Math.min(32, Math.round(parsed.numericValue))),
      };
      setStatPoints(nextStatPoints);
      setStatInputDrafts(buildStatInputDrafts(nextStatPoints, nextMarkers));

      return nextMarkers;
    });
  };

  const updateMove = (index: number, value: string) => {
    setMoves((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  };

  const handleNatureChange = (nextNature: string) => {
    const nextMarkers = buildNatureMarkerState(nextNature);
    setNature(nextNature);
    setNatureMarkers(nextMarkers);
    setStatInputDrafts(buildStatInputDrafts(statPoints, nextMarkers));
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
                onChange={(event) =>
                  handleNatureChange(event.currentTarget.value)
                }
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

          <div className="theme-subpanel rounded-2xl border p-3">
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
            <div className="mt-2 grid gap-2">
              {STAT_FIELDS.map(([key, label]) => {
                const value = statPoints[key];
                const remaining = MAX_STAT_POINTS - totalStatPoints;
                const maxValue = Math.min(32, value + remaining);

                return (
                  <div
                    key={key}
                    className="theme-subpanel rounded-lg px-2 py-1.5"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="theme-text-faint w-8 shrink-0 font-mono text-[9px] font-semibold uppercase tracking-[0.12em]">
                        {label}
                      </span>
                      <div className="ml-auto flex items-center gap-1.5">
                        <label
                          className="sr-only"
                          htmlFor={`set-editor-${key}`}
                        >
                          {label}
                        </label>
                        <input
                          id={`set-editor-${key}`}
                          type="text"
                          inputMode="text"
                          value={statInputDrafts[key]}
                          aria-label={label}
                          onFocus={(event) => {
                            event.currentTarget.select();
                          }}
                          onChange={(event) => {
                            updateStatPoint(key, event.currentTarget.value);
                          }}
                          className="theme-control theme-input h-7 w-16 rounded-md px-2 py-1 font-mono text-xs"
                        />
                        <span className="theme-text-dim font-mono text-[10px]">
                          SP
                        </span>
                      </div>
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
