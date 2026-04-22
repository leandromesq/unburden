"use client";

import { type ReactNode, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { useI18n } from "@/i18n/I18nProvider";
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
import { useOmniStore } from "@/store/use-omni-store";

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="theme-text-dim mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] leading-relaxed">
      {children}
    </div>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <div className="theme-text-dim mb-2 min-w-0 break-words text-[8px] font-semibold uppercase tracking-[0.22em] leading-relaxed">
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
      className={`max-w-full rounded-full px-3 py-1.5 text-left text-sm leading-4 whitespace-normal break-words ${
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
}: {
  title: string;
  tokens: Array<{ token: string; label: string }>;
  activeTokens: string[];
  disabled?: boolean;
  onInsert: (token: string) => void;
  emptyText?: string;
  fallbackEmptyText: string;
}) {
  return (
    <section className="theme-subpanel-strong min-w-0 rounded-2xl p-3">
      <GroupLabel>{title}</GroupLabel>
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
    <section className="theme-subpanel-strong min-w-0 rounded-2xl p-3">
      <GroupLabel>{labels.currentHp}</GroupLabel>
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
          className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
            disabled || value === null
              ? "theme-chip-disabled cursor-not-allowed"
              : "theme-chip"
          }`}
        >
          {labels.reset}
        </button>
      </div>
      <div className="theme-text-dim mt-2 text-sm leading-5">
        {value === null
          ? labels.defaultFullHp
          : labels.usingCurrentHp(value)}
      </div>
    </section>
  );
}

function StageControl({
  title,
  ariaLabel,
  summary,
  value,
  disabled = false,
  onChange,
  resetLabel,
}: {
  title: string;
  ariaLabel: string;
  summary: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  resetLabel: string;
}) {
  const decrementDisabled = disabled || value <= -6;
  const incrementDisabled = disabled || value >= 6;
  const resetDisabled = disabled || value === 0;

  return (
    <section className="theme-subpanel min-w-0 rounded-2xl p-3">
      <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0">
          <GroupLabel>{title}</GroupLabel>
        </div>
        <div className="theme-badge shrink-0 rounded-full px-2.5 py-1 font-mono text-xs">
          {value > 0 ? `+${value}` : value}
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          disabled={decrementDisabled}
          className={`h-8 w-8 shrink-0 rounded-full sm:h-9 sm:w-9 ${
            decrementDisabled
              ? "theme-chip-disabled cursor-not-allowed"
              : "theme-chip"
          }`}
          onClick={() => onChange(Math.max(-6, value - 1))}
        >
          -
        </button>
        <div className="min-w-0 flex-1">
          <input
            aria-label={ariaLabel}
            type="range"
            min={-6}
            max={6}
            step={1}
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(Number(event.currentTarget.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full disabled:cursor-not-allowed"
            style={{
              background: "var(--line-strong)",
              accentColor: "var(--accent)",
            }}
          />
          <div className="theme-text-dim mt-2 flex justify-between font-mono text-[10px] sm:text-[11px]">
            <span>-6</span>
            <span>0</span>
            <span>+6</span>
          </div>
        </div>
        <button
          type="button"
          disabled={incrementDisabled}
          className={`h-8 w-8 shrink-0 rounded-full sm:h-9 sm:w-9 ${
            incrementDisabled
              ? "theme-chip-disabled cursor-not-allowed"
              : "theme-chip"
          }`}
          onClick={() => onChange(Math.min(6, value + 1))}
        >
          +
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="theme-text-dim min-w-0 flex-1 text-sm leading-5">
          {summary}
        </div>
        <button
          type="button"
          disabled={resetDisabled}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs ${
            resetDisabled
              ? "theme-chip-disabled cursor-not-allowed"
              : "theme-chip"
          }`}
          onClick={() => onChange(0)}
        >
          {resetLabel}
        </button>
      </div>
    </section>
  );
}

function SideColumn({
  side,
  title,
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
    primaryControls: string;
    multipliers: string;
    attackerStageSummary: string;
    defenderStageSummary: string;
    speed: string;
    speedSummary: string;
    currentHp: string;
    reset: string;
    defaultFullHp: string;
    usingCurrentHp: (value: number) => string;
    toggles: string;
    stats: string;
    battleEffects: string;
    abilities: string;
    resolveThisSideFirst: string;
    noAbilitySuggestions: string;
    noOptionsYet: string;
  };
}) {
  return (
    <section className="theme-panel min-w-0 rounded-[28px] p-4">
      <SectionLabel>{title}</SectionLabel>
      <div className="grid gap-3">
        <div className="theme-text-faint text-[10px] font-semibold uppercase tracking-[0.22em]">
          {labels.primaryControls}
        </div>
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
          resetLabel={labels.reset}
        />
        <StageControl
          title={labels.speed}
          ariaLabel={`${side} speed slider`}
          summary={labels.speedSummary}
          value={speedValue}
          disabled={disabled}
          onChange={onSpeedChange}
          resetLabel={labels.reset}
        />
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
        <div className="theme-divider mt-1 border-t pt-3">
          <div className="theme-text-faint mb-3 text-[10px] font-semibold uppercase tracking-[0.22em]">
            {labels.toggles}
          </div>
          <div className="grid gap-3">
            <TokenGroup
              title={labels.stats}
              tokens={statTokens}
              activeTokens={activeTokens}
              disabled={disabled}
              onInsert={onInsert}
              fallbackEmptyText={labels.noOptionsYet}
            />
            <TokenGroup
              title={labels.battleEffects}
              tokens={effectTokens}
              activeTokens={activeTokens}
              disabled={disabled}
              onInsert={onInsert}
              fallbackEmptyText={labels.noOptionsYet}
            />
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
            />
          </div>
        </div>
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

  const attackerResolved =
    commandStructure.attacker.speciesExact ??
    commandStructure.attacker.speciesMatch;
  const defenderResolved =
    commandStructure.defender.speciesExact ??
    commandStructure.defender.speciesMatch;
  const defenderReady = Boolean(
    commandStructure.lexed.hasDelimiter && defenderResolved,
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
      attackerResolved
        ? getSuggestedAbilities(attackerResolved.entry.id, "", 4).map(
            (ability) => ({
              token: formatAbilityToken("attacker", ability),
              label: ability,
            }),
          )
        : [],
    [attackerResolved],
  );
  const defenderAbilityTokens = useMemo(
    () =>
      defenderResolved
        ? getSuggestedAbilities(defenderResolved.entry.id, "", 4).map(
            (ability) => ({
              token: formatAbilityToken("defender", ability),
              label: ability,
            }),
          )
        : [],
    [defenderResolved],
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
      <section className="theme-panel mb-5 min-w-0 rounded-[28px] p-4">
        <SectionLabel>{dictionary.modifierSwitches.global}</SectionLabel>
        <div className="grid gap-3 md:grid-cols-3">
          <TokenGroup
            title={dictionary.modifierSwitches.weather}
            tokens={GLOBAL_WEATHER_TOKENS}
            activeTokens={activeChipTokens.global}
            onInsert={(token) => handleInsert("global", token)}
            fallbackEmptyText={dictionary.modifierSwitches.noOptionsYet}
          />
          <TokenGroup
            title={dictionary.modifierSwitches.terrain}
            tokens={GLOBAL_TERRAIN_TOKENS}
            activeTokens={activeChipTokens.global}
            onInsert={(token) => handleInsert("global", token)}
            fallbackEmptyText={dictionary.modifierSwitches.noOptionsYet}
          />
          <TokenGroup
            title={dictionary.modifierSwitches.fieldEffects}
            tokens={GLOBAL_FIELD_TOKENS}
            activeTokens={activeChipTokens.global}
            onInsert={(token) => handleInsert("global", token)}
            fallbackEmptyText={dictionary.modifierSwitches.noOptionsYet}
          />
        </div>
      </section>
      <div className="grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SideColumn
          side="attacker"
          title={dictionary.modifierSwitches.attacker}
          activeTokens={activeChipTokens.attacker}
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
