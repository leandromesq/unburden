"use client";

import { Trash2 } from "lucide-react";

import { SummaryHeader } from "@/components/omnibar/pokemon-summary/summary-header";
import { SearchableCombobox } from "@/components/omnibar/searchable-combobox";
import { PokemonIdentitySummary } from "@/components/pokemon/pokemon-identity-summary";
import { useI18n } from "@/i18n/I18nProvider";
import {
  getBaseSpeciesForMega,
  getMegaEvolutionTargets,
  resolveMegaEvolution,
} from "@/lib/data/pokemon";
import { normalizeId } from "@/lib/data/normalization";
import { resolveSpeedSide } from "@/lib/speed/speed-benchmark";
import type { PokemonEntry, SpeedSideState } from "@/lib/types";

const SPEED_RELEVANT_ABILITIES = new Set([
  "Chlorophyll",
  "Quick Feet",
  "Sand Rush",
  "Slush Rush",
  "Surge Surfer",
  "Swift Swim",
  "Unburden",
]);

function addOverride(side: SpeedSideState, value: string) {
  return side.overrides.includes(value)
    ? side.overrides
    : [...side.overrides, value];
}

function removeOverride(side: SpeedSideState, value: string) {
  return side.overrides.filter((override) => override !== value);
}

function removeNormalizedOverrides(
  side: SpeedSideState,
  values: Array<string | undefined>,
) {
  const normalizedValues = new Set(
    values.flatMap((value) => (value ? [normalizeId(value)] : [])),
  );

  if (!normalizedValues.size) {
    return side.overrides;
  }

  return side.overrides.filter(
    (override) => !normalizedValues.has(normalizeId(override)),
  );
}

function resolveAbilityForPokemon(
  ability: string | undefined,
  pokemon: PokemonEntry,
) {
  return (
    pokemon.abilities.find(
      (candidate) => normalizeId(candidate) === normalizeId(ability ?? ""),
    ) ?? pokemon.abilities[0]
  );
}

function getMegaToggleState(
  side: SpeedSideState,
  metrics: NonNullable<ReturnType<typeof resolveSpeedSide>>,
) {
  const activePokemon = metrics.resolvedPokemon;
  const basePokemon =
    getBaseSpeciesForMega(activePokemon.id) ?? metrics.pokemon;
  const targets = getMegaEvolutionTargets(basePokemon.id);

  if (!activePokemon.isMega && !targets.length) {
    return null;
  }

  return {
    basePokemon,
    isMegaActive: Boolean(activePokemon.isMega),
    targetPokemon: activePokemon.isMega
      ? basePokemon
      : (resolveMegaEvolution(basePokemon.id, side.item) ?? targets[0] ?? null),
  };
}

function MegaToggleButton({
  isMegaActive,
  onClick,
}: {
  isMegaActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isMegaActive ? "Switch to base form" : "Switch to mega form"}
      title={isMegaActive ? "Mega form active" : "Mega form"}
      aria-pressed={isMegaActive}
      className={`theme-icon-button theme-icon-button-mega flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg p-0 ${
        isMegaActive
          ? "theme-icon-button-mega-active"
          : "theme-icon-button-mega-inactive"
      }`}
    >
      <span
        aria-hidden="true"
        className="block h-6.5 w-6.5 shrink-0"
        style={{
          backgroundColor: "var(--mega-icon-color)",
          maskImage: "url('/icons/mega-icon.svg')",
          maskRepeat: "no-repeat",
          maskPosition: "center",
          maskSize: "100% 100%",
          WebkitMaskImage: "url('/icons/mega-icon.svg')",
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          WebkitMaskSize: "100% 100%",
        }}
      />
    </button>
  );
}

interface SpeedSidePanelProps {
  title: string;
  side: SpeedSideState | null;
  metrics: ReturnType<typeof resolveSpeedSide>;
  onChange: (patch: Partial<SpeedSideState>) => void;
  onClear?: () => void;
  showIdentity?: boolean;
  showControls?: boolean;
  speciesInput?: string;
  speciesOptions?: string[];
  onInputSpecies?: (value: string) => void;
  onCommitSpecies?: (value: string) => void;
}

export function SpeedSidePanel({
  title,
  side,
  metrics,
  onChange,
  onClear,
  showIdentity = true,
  showControls = true,
  speciesInput = "",
  speciesOptions = [],
  onInputSpecies,
  onCommitSpecies,
}: SpeedSidePanelProps) {
  const { dictionary } = useI18n();
  const speed = dictionary.speedBenchmark;
  const speId = `${title}-spe-sp`;
  const stageId = `${title}-speed-stage`;
  const abilityId = `${title}-ability`;

  if (!side || !metrics) {
    return (
      <section className="theme-panel rounded-lg p-4">
        <SummaryHeader title={title} />
        <div className="mt-3 flex min-w-0 items-start gap-3">
          <div className="theme-subpanel flex h-16 w-16 shrink-0 items-center justify-center rounded-lg p-2">
            <div className="theme-text-faint font-mono text-xs">—</div>
          </div>
          <div className="min-w-0">
            <div className="text-lg font-medium">{title}</div>
            <div className="theme-text-dim mt-1 text-sm">{speed.noPokemon}</div>
          </div>
        </div>
        {onInputSpecies && onCommitSpecies ? (
          <div className="mt-3">
            <SearchableCombobox
              label="Pokemon"
              hideLabel
              compact
              name={`${title}-pokemon-species`}
              value={speciesInput}
              options={speciesOptions}
              placeholder="Pokemon"
              onChange={onInputSpecies}
              onInputChange={onInputSpecies}
              onSelectOption={onCommitSpecies}
              onBlur={onCommitSpecies}
            />
          </div>
        ) : null}
      </section>
    );
  }

  const currentSide = side;
  const currentMetrics = metrics;
  const megaToggle = getMegaToggleState(currentSide, currentMetrics);
  const abilities = currentMetrics.resolvedPokemon.abilities.slice().sort((left, right) => {
    const leftRelevant = SPEED_RELEVANT_ABILITIES.has(left);
    const rightRelevant = SPEED_RELEVANT_ABILITIES.has(right);

    if (leftRelevant === rightRelevant) return left.localeCompare(right);
    return leftRelevant ? -1 : 1;
  });

  function handleMegaToggle() {
    if (!megaToggle?.targetPokemon) {
      return;
    }

    if (megaToggle.isMegaActive) {
      onChange({
        source: "species",
        sourceLabel: undefined,
        setSnapshot: undefined,
        speciesId: megaToggle.basePokemon.id,
        item: undefined,
        ability: resolveAbilityForPokemon(currentSide.ability, megaToggle.basePokemon),
        overrides: removeNormalizedOverrides(currentSide, [
          currentSide.item,
          currentMetrics.resolvedPokemon.requiredItem,
        ]),
      });
      return;
    }

    onChange({
      source: "species",
      sourceLabel: undefined,
      setSnapshot: undefined,
      speciesId: megaToggle.targetPokemon.id,
      item: undefined,
      ability: resolveAbilityForPokemon(currentSide.ability, megaToggle.targetPokemon),
      overrides: removeNormalizedOverrides(currentSide, [
        currentSide.item,
        megaToggle.targetPokemon.requiredItem,
      ]),
    });
  }

  return (
    <section className="theme-panel rounded-lg p-4">
      <SummaryHeader
        title={title}
        megaToggle={
          megaToggle?.targetPokemon ? (
            <MegaToggleButton
              isMegaActive={megaToggle.isMegaActive}
              onClick={handleMegaToggle}
            />
          ) : null
        }
        removeAction={
          onClear ? (
            <button
              type="button"
              aria-label={speed.clear}
              title={speed.clear}
              onClick={onClear}
              className="theme-icon-button theme-icon-button-sm shrink-0 text-sm"
              style={{ color: "var(--accent-text-mid)" }}
            >
              <Trash2 aria-hidden="true" size={15} strokeWidth={1.9} />
            </button>
          ) : null
        }
      />

      {showIdentity && onInputSpecies && onCommitSpecies ? (
        <div className="mt-3">
          <SearchableCombobox
            label="Pokemon"
            hideLabel
            compact
            name={`${title}-pokemon-species`}
            value={speciesInput || metrics.resolvedPokemon.name}
            options={speciesOptions}
            placeholder="Pokemon"
            onChange={onInputSpecies}
            onInputChange={onInputSpecies}
            onSelectOption={onCommitSpecies}
            onBlur={onCommitSpecies}
          />
        </div>
      ) : null}

      {showIdentity ? (
      <div className="mt-3">
        <PokemonIdentitySummary
          pokemon={metrics.pokemon}
          resolvedPokemon={metrics.resolvedPokemon}
          meta={
            <div className="theme-text-faint flex flex-wrap gap-x-3 gap-y-1 text-xs">
              <span>Base {metrics.resolvedPokemon.baseStats.spe}</span>
              <span>{speed.rawSpeed}: {metrics.rawSpeed}</span>
              {side.item ? <span>{side.item}</span> : null}
              {side.sourceLabel ? <span>{side.sourceLabel}</span> : null}
            </div>
          }
        />
        <div className="mt-3 flex items-baseline justify-between border-t border-[var(--line)] pt-3">
          <div className="theme-data-label">{speed.effectiveSpeed}</div>
          <div className="text-3xl font-semibold tabular-nums">
            {metrics.effectiveSpeed}
          </div>
        </div>
      </div>
      ) : null}

      {showControls ? (
      <div className={showIdentity ? "mt-5 space-y-4" : "mt-3 space-y-4"}>
        <label className="block" htmlFor={speId}>
          <span className="theme-text-faint">{speed.speSp}: {side.speSp}</span>
        </label>
        <input
          id={speId}
          type="range"
          min={0}
          max={32}
          value={side.speSp}
          onChange={(event) => onChange({ speSp: Number(event.currentTarget.value) })}
          className="w-full accent-[var(--accent)]"
        />

        <div>
          <label className="block" htmlFor={stageId}>
            <span className="theme-text-faint">{speed.stage}</span>
          </label>
          <div className="mt-2 grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] gap-2">
            <button
              type="button"
              onClick={() => onChange({ speedStage: Math.max(-6, side.speedStage - 1) })}
              className="theme-toolbar-button h-9 rounded px-0 text-base"
              aria-label={`${speed.stage} -1`}
            >
              -
            </button>
            <input
              id={stageId}
              type="number"
              min={-6}
              max={6}
              value={side.speedStage}
              onChange={(event) => {
                const value = Number(event.currentTarget.value);
                onChange({ speedStage: Math.max(-6, Math.min(6, value)) });
              }}
              className="theme-control h-9 w-full rounded px-2 text-center text-sm tabular-nums"
            />
            <button
              type="button"
              onClick={() => onChange({ speedStage: Math.min(6, side.speedStage + 1) })}
              className="theme-toolbar-button h-9 rounded px-0 text-base"
              aria-label={`${speed.stage} +1`}
            >
              +
            </button>
          </div>
        </div>

        <label className="block" htmlFor={abilityId}>
          <span className="theme-text-faint">{speed.ability}</span>
        </label>
        <select
          id={abilityId}
          value={side.ability ?? ""}
          onChange={(event) => {
            const ability = event.currentTarget.value || undefined;
            onChange({
              ability,
              overrides: ability ? addOverride(side, ability) : side.overrides,
            });
          }}
          className="theme-control h-9 w-full rounded px-2 text-sm"
        >
          {abilities.map((ability) => (
            <option key={ability} value={ability}>
              {ability}
            </option>
          ))}
        </select>

        <div>
          <div className="theme-text-faint mb-2">{speed.nature}</div>
          <div className="grid grid-cols-3 gap-2">
            {([
              ["minus", speed.minusNature],
              ["neutral", speed.neutralNature],
              ["plus", speed.plusNature],
            ] as const).map(([nature, label]) => (
              <button
                key={nature}
                type="button"
                onClick={() => onChange({ nature })}
                className={`rounded px-2 py-2 text-xs ${
                  side.nature === nature ? "theme-chip-active" : "theme-chip"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onChange({ tailwind: !side.tailwind })}
            className={`rounded px-3 py-2 text-xs ${side.tailwind ? "theme-chip-active" : "theme-chip"}`}
          >
            {speed.tailwind}
          </button>
          <button
            type="button"
            onClick={() => {
              const enabled = side.item !== "Choice Scarf";
              onChange({
                item: enabled ? "Choice Scarf" : undefined,
                overrides: enabled
                  ? addOverride(side, "Choice Scarf")
                  : removeOverride(side, "Choice Scarf"),
              });
            }}
            className={`rounded px-3 py-2 text-xs ${side.item === "Choice Scarf" ? "theme-chip-active" : "theme-chip"}`}
          >
            {speed.choiceScarf}
          </button>
          <button
            type="button"
            onClick={() => onChange({ paralysis: !side.paralysis })}
            className={`rounded px-3 py-2 text-xs ${side.paralysis ? "theme-chip-active" : "theme-chip"}`}
          >
            {speed.paralysis}
          </button>
        </div>
      </div>
      ) : null}
    </section>
  );
}
