"use client";

import { type ReactNode, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { useI18n } from "@/i18n/I18nProvider";
import { normalizeId } from "@/lib/data/normalization";
import { pokemonById } from "@/lib/data/pokemon";
import {
  ATTACKER_MODIFIER_MAP,
  ATTACKER_CHIP_DEFINITIONS,
  DEFENDER_MODIFIER_MAP,
  DEFENDER_CHIP_DEFINITIONS,
  GLOBAL_CHIP_DEFINITIONS,
  formatAbilityToken,
  formatModifierToken,
  type ModifierDefinition,
  type ModifierScope,
} from "@/lib/parser/grammar";
import { getSuggestedAbilities } from "@/lib/parser/inference";
import { resolveSetReferenceToken } from "@/lib/team/set-references";
import { useOmniStore } from "@/store/use-omni-store";
import { useTeamStore } from "@/store/use-team-store";

function SectionLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`theme-section-title ${className}`}>
      {children}
    </div>
  );
}

function GroupLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`theme-text-dim min-w-0 break-words text-[13px] font-medium leading-5 ${className}`}
    >
      {children}
    </div>
  );
}

function ModifierButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`max-w-full rounded-md px-3 py-1.5 text-left text-sm leading-4 whitespace-normal break-words ${
        active
          ? "theme-chip-active"
          : disabled
            ? "theme-chip-disabled cursor-not-allowed"
            : "theme-chip"
      }`}
    >
      {label}
    </button>
  );
}

function TokenGroup({
  title,
  tokens,
  activeTokens,
  disabled,
  onInsert,
  emptyText,
  fallbackEmptyText,
  variant = "card",
}: {
  title: string;
  tokens: Array<{ token: string; label: string }>;
  activeTokens: string[];
  disabled?: boolean;
  onInsert: (token: string) => void;
  emptyText?: string;
  fallbackEmptyText: string;
  variant?: "card" | "plain";
}) {
  const content = (
    <>
      <GroupLabel className="mb-2">{title}</GroupLabel>
      {tokens.length ? (
        <div className="flex flex-wrap items-start gap-2">
          {tokens.map((definition) => {
            const active = activeTokens.includes(definition.token);

            return (
              <ModifierButton
                key={definition.token}
                active={active}
                disabled={disabled}
                label={definition.label}
                onClick={() => onInsert(definition.token)}
              />
            );
          })}
        </div>
      ) : (
        <div className="theme-text-faint text-sm">
          {emptyText ?? fallbackEmptyText}
        </div>
      )}
    </>
  );

  if (variant === "plain") {
    return <section className="min-w-0">{content}</section>;
  }

  return (
    <section className="theme-subpanel min-w-0 rounded-lg p-3">
      {content}
    </section>
  );
}

function HpPercentageControl({
  value,
  disabled,
  onChange,
  labels,
}: {
  value: number | null;
  disabled?: boolean;
  onChange: (value: number | null) => void;
  labels: {
    currentHp: string;
    reset: string;
    defaultFullHp: string;
    usingCurrentHp: (value: number) => string;
  };
}) {
  const options = [25, 50, 75];

  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <GroupLabel className="mb-0">{labels.currentHp}</GroupLabel>
        <div className="theme-section-meta text-right">
          {value === null
            ? labels.defaultFullHp
            : labels.usingCurrentHp(value)}
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        {options.map((percent) => (
          <ModifierButton
            key={percent}
            active={value === percent}
            disabled={disabled}
            label={`${percent}%`}
            onClick={() => onChange(percent)}
          />
        ))}
        <button
          type="button"
          disabled={disabled || value === null}
          onClick={() => onChange(null)}
          className={`shrink-0 rounded-md px-3 py-1.5 text-sm ${
            disabled || value === null
              ? "theme-chip-disabled cursor-not-allowed"
              : "theme-chip"
          }`}
        >
          {labels.reset}
        </button>
      </div>
    </div>
  );
}

function clampStage(value: number) {
  return Math.max(-6, Math.min(6, value));
}

function StageControl({
  title,
  ariaLabel,
  summary,
  value,
  disabled = false,
  onChange,
}: {
  title: string;
  ariaLabel: string;
  summary: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const decrementDisabled = disabled || value <= -6;
  const incrementDisabled = disabled || value >= 6;
  const handleInputChange = (nextValue: string) => {
    const parsedValue = Number(nextValue);

    if (Number.isNaN(parsedValue)) {
      return;
    }

    onChange(clampStage(parsedValue));
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div className="min-w-0">
        <GroupLabel className="mb-0">{title}</GroupLabel>
        <div className="theme-section-meta">{summary}</div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          disabled={decrementDisabled}
          aria-label={`${title} down`}
          className={`theme-icon-button theme-icon-button-sm ${
            decrementDisabled
              ? "theme-chip-disabled cursor-not-allowed"
              : ""
          }`}
          onClick={() => onChange(clampStage(value - 1))}
        >
          -
        </button>
        <div className="min-w-0">
          <input
            aria-label={ariaLabel}
            type="number"
            min={-6}
            max={6}
            step={1}
            value={value}
            disabled={disabled}
            onChange={(event) => handleInputChange(event.currentTarget.value)}
            className="theme-control theme-field-sm theme-number-input w-14 bg-transparent px-2 text-center font-mono text-sm outline-none disabled:cursor-not-allowed"
            style={{ appearance: "textfield", MozAppearance: "textfield" }}
          />
        </div>
        <button
          type="button"
          disabled={incrementDisabled}
          aria-label={`${title} up`}
          className={`theme-icon-button theme-icon-button-sm ${
            incrementDisabled
              ? "theme-chip-disabled cursor-not-allowed"
              : ""
          }`}
          onClick={() => onChange(clampStage(value + 1))}
        >
          +
        </button>
      </div>
    </div>
  );
}

function SideColumn({
  side,
  title,
  subtitle,
  activeTokens,
  disabled = false,
  stageValue,
  speedValue,
  hpPercent,
  statTokens,
  effectTokens,
  abilityTokens,
  onInsert,
  onStageChange,
  onSpeedChange,
  onHpChange,
  labels,
}: {
  side: "attacker" | "defender";
  title: string;
  subtitle?: string;
  activeTokens: string[];
  disabled?: boolean;
  stageValue: number;
  speedValue: number;
  hpPercent: number | null;
  statTokens: Array<{ token: string; label: string }>;
  effectTokens: Array<{ token: string; label: string }>;
  abilityTokens: Array<{ token: string; label: string }>;
  onInsert: (token: string) => void;
  onStageChange: (value: number) => void;
  onSpeedChange: (value: number) => void;
  onHpChange: (value: number | null) => void;
  labels: {
    multipliers: string;
    attackerStageSummary: string;
    defenderStageSummary: string;
    speed: string;
    speedSummary: string;
    currentHp: string;
    reset: string;
    defaultFullHp: string;
    usingCurrentHp: (value: number) => string;
    stats: string;
    battleEffects: string;
    abilities: string;
    resolveThisSideFirst: string;
    noAbilitySuggestions: string;
    noOptionsYet: string;
  };
}) {
  return (
    <section
      className={`theme-panel min-w-0 rounded-xl p-4 ${
        disabled ? "opacity-75" : ""
      }`}
    >
      <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2">
        <SectionLabel>{title}</SectionLabel>
        {subtitle ? (
          <div className="theme-section-meta min-w-0 truncate">
            {subtitle}
          </div>
        ) : disabled ? (
          <div className="theme-section-meta min-w-0 truncate">
            {labels.resolveThisSideFirst}
          </div>
        ) : null}
      </div>
      <div className="grid gap-3">
        <section className="theme-subpanel min-w-0 rounded-lg p-3">
          <div className="grid gap-3">
            <StageControl
              title={labels.multipliers}
              ariaLabel={`${side} stage slider`}
              summary={
                side === "attacker"
                  ? labels.attackerStageSummary
                  : labels.defenderStageSummary
              }
              value={stageValue}
              disabled={disabled}
              onChange={onStageChange}
            />
            <div className="theme-divider border-t pt-3">
              <StageControl
                title={labels.speed}
                ariaLabel={`${side} speed slider`}
                summary={labels.speedSummary}
                value={speedValue}
                disabled={disabled}
                onChange={onSpeedChange}
              />
            </div>
            <div className="theme-divider border-t pt-3">
              <HpPercentageControl
                value={hpPercent}
                disabled={disabled}
                onChange={onHpChange}
                labels={{
                  currentHp: labels.currentHp,
                  reset: labels.reset,
                  defaultFullHp: labels.defaultFullHp,
                  usingCurrentHp: labels.usingCurrentHp,
                }}
              />
            </div>
          </div>
        </section>
        <section className="theme-subpanel min-w-0 rounded-lg p-3">
          <div className="grid gap-4">
            <TokenGroup
              title={labels.stats}
              tokens={statTokens}
              activeTokens={activeTokens}
              disabled={disabled}
              onInsert={onInsert}
              fallbackEmptyText={labels.noOptionsYet}
              variant="plain"
            />
            <div className="theme-divider border-t pt-4">
              <TokenGroup
                title={labels.battleEffects}
                tokens={effectTokens}
                activeTokens={activeTokens}
                disabled={disabled}
                onInsert={onInsert}
                fallbackEmptyText={labels.noOptionsYet}
                variant="plain"
              />
            </div>
            <div className="theme-divider border-t pt-4">
              <TokenGroup
                title={labels.abilities}
                tokens={abilityTokens}
                activeTokens={activeTokens}
                disabled={disabled}
                onInsert={onInsert}
                emptyText={
                  disabled
                    ? labels.resolveThisSideFirst
                    : labels.noAbilitySuggestions
                }
                fallbackEmptyText={labels.noOptionsYet}
                variant="plain"
              />
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

function toGroupTokens(scope: ModifierScope, tokens: ModifierDefinition[]) {
  return tokens.map((definition) => ({
    token: formatModifierToken(scope, definition.token),
    label: definition.label,
  }));
}

const GLOBAL_WEATHER_TOKENS = toGroupTokens(
  "global",
  GLOBAL_CHIP_DEFINITIONS.filter(
    (definition) => definition.section === "weather",
  ),
);
const GLOBAL_TERRAIN_TOKENS = toGroupTokens(
  "global",
  GLOBAL_CHIP_DEFINITIONS.filter(
    (definition) => definition.section === "terrain",
  ),
);
const GLOBAL_FIELD_TOKENS = toGroupTokens(
  "global",
  GLOBAL_CHIP_DEFINITIONS.filter(
    (definition) => definition.section === "field_effects",
  ),
);
const ATTACKER_STAT_TOKENS = toGroupTokens(
  "attacker",
  ATTACKER_CHIP_DEFINITIONS.filter(
    (definition) => definition.section === "stats",
  ),
);
const ATTACKER_EFFECT_TOKENS = toGroupTokens(
  "attacker",
  ATTACKER_CHIP_DEFINITIONS.filter(
    (definition) => definition.section === "move_effects",
  ),
);
const DEFENDER_STAT_TOKENS = toGroupTokens(
  "defender",
  DEFENDER_CHIP_DEFINITIONS.filter(
    (definition) => definition.section === "stats",
  ),
);
const DEFENDER_EFFECT_TOKENS = toGroupTokens(
  "defender",
  DEFENDER_CHIP_DEFINITIONS.filter(
    (definition) => definition.section === "move_effects",
  ),
);

function resolveModifierSidePokemon(
  segment: ReturnType<typeof useOmniStore.getState>["commandStructure"]["attacker"],
  importedSets: ReturnType<typeof useTeamStore.getState>["importedSets"],
) {
  const referenceSet = resolveSetReferenceToken(
    segment.leadingFreeTokens[0]?.raw,
    importedSets,
  );

  if (referenceSet) {
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

export function ModifierSwitches() {
  const { dictionary } = useI18n();
  const {
    commandStructure,
    activeChipTokens,
    insertChip,
    setStatModifier,
    setSpeedModifier,
    setHpPercentage,
  } = useOmniStore(
    useShallow((state) => ({
      commandStructure: state.commandStructure,
      activeChipTokens: state.activeChipTokens,
      insertChip: state.insertChip,
      setStatModifier: state.setStatModifier,
      setSpeedModifier: state.setSpeedModifier,
      setHpPercentage: state.setHpPercentage,
    })),
  );
  const importedSets = useTeamStore((state) => state.importedSets);

  const attackerPokemon = useMemo(
    () => resolveModifierSidePokemon(commandStructure.attacker, importedSets),
    [commandStructure.attacker, importedSets],
  );
  const defenderPokemon = useMemo(
    () => resolveModifierSidePokemon(commandStructure.defender, importedSets),
    [commandStructure.defender, importedSets],
  );
  const attackerReady = Boolean(attackerPokemon);
  const defenderReady = Boolean(
    commandStructure.lexed.hasDelimiter && defenderPokemon,
  );
  const attackerHpPercent = commandStructure.attacker.hpToken
    ? Number(commandStructure.attacker.hpToken.value)
    : null;
  const defenderHpPercent = commandStructure.defender.hpToken
    ? Number(commandStructure.defender.hpToken.value)
    : null;

  const attackerStage = Math.max(
    -6,
    Math.min(
      6,
      commandStructure.attacker.modifierTokens.reduce((sum, token) => {
        const definition = ATTACKER_MODIFIER_MAP.get(token.value);
        return definition?.kind === "stat_mod"
          ? sum + (definition.statMod ?? 0)
          : sum;
      }, 0),
    ),
  );
  const attackerSpeedStage = Math.max(
    -6,
    Math.min(
      6,
      commandStructure.attacker.modifierTokens.reduce((sum, token) => {
        const definition = ATTACKER_MODIFIER_MAP.get(token.value);
        return definition?.kind === "speed_mod"
          ? sum + (definition.statMod ?? 0)
          : sum;
      }, 0),
    ),
  );
  const defenderStage = Math.max(
    -6,
    Math.min(
      6,
      commandStructure.defender.modifierTokens.reduce((sum, token) => {
        const definition = DEFENDER_MODIFIER_MAP.get(token.value);
        return definition?.kind === "stat_mod"
          ? sum + (definition.statMod ?? 0)
          : sum;
      }, 0),
    ),
  );
  const defenderSpeedStage = Math.max(
    -6,
    Math.min(
      6,
      commandStructure.defender.modifierTokens.reduce((sum, token) => {
        const definition = DEFENDER_MODIFIER_MAP.get(token.value);
        return definition?.kind === "speed_mod"
          ? sum + (definition.statMod ?? 0)
          : sum;
      }, 0),
    ),
  );

  const attackerAbilityTokens = useMemo(
    () =>
      attackerPokemon
        ? getSuggestedAbilities(attackerPokemon.id, "", 4).map(
            (ability) => ({
              token: formatAbilityToken("attacker", ability),
              label: ability,
            }),
          )
        : [],
    [attackerPokemon],
  );
  const defenderAbilityTokens = useMemo(
    () =>
      defenderPokemon
        ? getSuggestedAbilities(defenderPokemon.id, "", 4).map(
            (ability) => ({
              token: formatAbilityToken("defender", ability),
              label: ability,
            }),
          )
        : [],
    [defenderPokemon],
  );

  const handleInsert = (
    scope: "attacker" | "defender" | "global",
    token: string,
  ) => {
    insertChip(scope, token);
  };

  const handleStageChange = (scope: "attacker" | "defender", value: number) => {
    setStatModifier(scope, value);
  };
  const handleSpeedChange = (scope: "attacker" | "defender", value: number) => {
    setSpeedModifier(scope, value);
  };
  const handleHpChange = (
    scope: "attacker" | "defender",
    value: number | null,
  ) => {
    setHpPercentage(scope, value);
  };

  return (
    <div className="min-w-0 px-4 py-4 md:px-5 md:py-5">
      <section className="mb-4 min-w-0 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
        <div className="mb-3">
          <SectionLabel>{dictionary.modifierSwitches.global}</SectionLabel>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <TokenGroup
            title={dictionary.modifierSwitches.weather}
            tokens={GLOBAL_WEATHER_TOKENS}
            activeTokens={activeChipTokens.global}
            onInsert={(token) => handleInsert("global", token)}
            fallbackEmptyText={dictionary.modifierSwitches.noOptionsYet}
            variant="plain"
          />
          <TokenGroup
            title={dictionary.modifierSwitches.terrain}
            tokens={GLOBAL_TERRAIN_TOKENS}
            activeTokens={activeChipTokens.global}
            onInsert={(token) => handleInsert("global", token)}
            fallbackEmptyText={dictionary.modifierSwitches.noOptionsYet}
            variant="plain"
          />
          <TokenGroup
            title={dictionary.modifierSwitches.fieldEffects}
            tokens={GLOBAL_FIELD_TOKENS}
            activeTokens={activeChipTokens.global}
            onInsert={(token) => handleInsert("global", token)}
            fallbackEmptyText={dictionary.modifierSwitches.noOptionsYet}
            variant="plain"
          />
        </div>
      </section>
      <div className="grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SideColumn
          side="attacker"
          title={dictionary.modifierSwitches.attacker}
          subtitle={attackerPokemon?.name}
          activeTokens={activeChipTokens.attacker}
          disabled={!attackerReady}
          stageValue={attackerStage}
          speedValue={attackerSpeedStage}
          hpPercent={attackerHpPercent}
          statTokens={ATTACKER_STAT_TOKENS}
          effectTokens={ATTACKER_EFFECT_TOKENS}
          abilityTokens={attackerAbilityTokens}
          onInsert={(token) => handleInsert("attacker", token)}
          onStageChange={(value) => handleStageChange("attacker", value)}
          onSpeedChange={(value) => handleSpeedChange("attacker", value)}
          onHpChange={(value) => handleHpChange("attacker", value)}
          labels={dictionary.modifierSwitches}
        />
        <SideColumn
          side="defender"
          title={dictionary.modifierSwitches.defender}
          subtitle={defenderPokemon?.name}
          activeTokens={activeChipTokens.defender}
          disabled={!defenderReady}
          stageValue={defenderStage}
          speedValue={defenderSpeedStage}
          hpPercent={defenderHpPercent}
          statTokens={DEFENDER_STAT_TOKENS}
          effectTokens={DEFENDER_EFFECT_TOKENS}
          abilityTokens={defenderAbilityTokens}
          onInsert={(token) => handleInsert("defender", token)}
          onStageChange={(value) => handleStageChange("defender", value)}
          onSpeedChange={(value) => handleSpeedChange("defender", value)}
          onHpChange={(value) => handleHpChange("defender", value)}
          labels={dictionary.modifierSwitches}
        />
      </div>
    </div>
  );
}
