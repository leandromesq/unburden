"use client";

import { type ReactNode, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { analyzeCommandStructure } from "@/lib/parser/command-structure";
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
    <div className="theme-text-dim mb-3 text-[10px] font-semibold uppercase tracking-[0.24em]">
      {children}
    </div>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <div className="theme-text-dim mb-2 text-[8px] font-semibold uppercase tracking-[0.22em]">
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
      className={`rounded-full px-3 py-1.5 text-sm ${
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
}: {
  title: string;
  tokens: Array<{ token: string; label: string }>;
  activeTokens: string[];
  disabled?: boolean;
  onInsert: (token: string) => void;
  emptyText?: string;
}) {
  return (
    <section className="theme-subpanel-strong rounded-2xl p-3">
      <GroupLabel>{title}</GroupLabel>
      {tokens.length ? (
        <div className="flex flex-wrap gap-2">
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
          {emptyText ?? "No options yet."}
        </div>
      )}
    </section>
  );
}

function HpPercentageControl({
  value,
  disabled,
  onChange,
}: {
  value: number | null;
  disabled?: boolean;
  onChange: (value: number | null) => void;
}) {
  const options = [25, 50, 75];

  return (
    <section className="theme-subpanel-strong rounded-2xl p-3">
      <GroupLabel>Current HP</GroupLabel>
      <div className="flex flex-wrap gap-2">
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
          className={`rounded-full px-3 py-1.5 text-sm ${
            disabled || value === null
              ? "theme-chip-disabled cursor-not-allowed"
              : "theme-chip"
          }`}
        >
          Reset
        </button>
      </div>
      <div className="theme-text-dim mt-2 text-sm">
        {value === null ? "Default: full HP" : `Using ${value}% current HP`}
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
  const resetDisabled = disabled || value === 0;

  return (
    <section className="theme-subpanel rounded-2xl p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <GroupLabel>{title}</GroupLabel>
        <div className="theme-badge rounded-full px-2.5 py-1 font-mono text-xs">
          {value > 0 ? `+${value}` : value}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={decrementDisabled}
          className={`h-9 w-9 rounded-full ${
            decrementDisabled
              ? "theme-chip-disabled cursor-not-allowed"
              : "theme-chip"
          }`}
          onClick={() => onChange(Math.max(-6, value - 1))}
        >
          -
        </button>
        <div className="flex-1">
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
          <div className="theme-text-dim mt-2 flex justify-between font-mono text-[11px]">
            <span>-6</span>
            <span>0</span>
            <span>+6</span>
          </div>
        </div>
        <button
          type="button"
          disabled={incrementDisabled}
          className={`h-9 w-9 rounded-full ${
            incrementDisabled
              ? "theme-chip-disabled cursor-not-allowed"
              : "theme-chip"
          }`}
          onClick={() => onChange(Math.min(6, value + 1))}
        >
          +
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="theme-text-dim text-sm">{summary}</div>
        <button
          type="button"
          disabled={resetDisabled}
          className={`rounded-full px-3 py-1.5 text-xs ${
            resetDisabled
              ? "theme-chip-disabled cursor-not-allowed"
              : "theme-chip"
          }`}
          onClick={() => onChange(0)}
        >
          Reset
        </button>
      </div>
    </section>
  );
}

function SideColumn({
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
}: {
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
}) {
  const lowerTitle = title.toLowerCase() as "attacker" | "defender";

  return (
    <section className="theme-panel rounded-[28px] p-4">
      <SectionLabel>{title}</SectionLabel>
      <div className="grid gap-3">
        <div className="theme-text-faint text-[10px] font-semibold uppercase tracking-[0.22em]">
          Primary Controls
        </div>
        <StageControl
          title="Multipliers"
          ariaLabel={`${lowerTitle} stage slider`}
          summary={
            lowerTitle === "attacker" ? "Atk / SpA stage" : "Def / SpD stage"
          }
          value={stageValue}
          disabled={disabled}
          onChange={onStageChange}
        />
        <StageControl
          title="Speed"
          ariaLabel={`${lowerTitle} speed slider`}
          summary="Spe stage"
          value={speedValue}
          disabled={disabled}
          onChange={onSpeedChange}
        />
        <HpPercentageControl
          value={hpPercent}
          disabled={disabled}
          onChange={onHpChange}
        />
        <div className="theme-divider mt-1 border-t pt-3">
          <div className="theme-text-faint mb-3 text-[10px] font-semibold uppercase tracking-[0.22em]">
            Toggles
          </div>
          <div className="grid gap-3">
            <TokenGroup
              title="Stats"
              tokens={statTokens}
              activeTokens={activeTokens}
              disabled={disabled}
              onInsert={onInsert}
            />
            <TokenGroup
              title="Battle Effects"
              tokens={effectTokens}
              activeTokens={activeTokens}
              disabled={disabled}
              onInsert={onInsert}
            />
            <TokenGroup
              title="Abilities"
              tokens={abilityTokens}
              activeTokens={activeTokens}
              disabled={disabled}
              onInsert={onInsert}
              emptyText={
                disabled
                  ? "Resolve this side first."
                  : "No ability suggestions."
              }
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
    <div className="px-5 py-5">
      <section className="theme-panel mb-5 rounded-[28px] p-4">
        <SectionLabel>Global</SectionLabel>
        <div className="grid gap-3 md:grid-cols-3">
          <TokenGroup
            title="Weather"
            tokens={GLOBAL_WEATHER_TOKENS}
            activeTokens={activeChipTokens.global}
            onInsert={(token) => handleInsert("global", token)}
          />
          <TokenGroup
            title="Terrain"
            tokens={GLOBAL_TERRAIN_TOKENS}
            activeTokens={activeChipTokens.global}
            onInsert={(token) => handleInsert("global", token)}
          />
          <TokenGroup
            title="Field Effects"
            tokens={GLOBAL_FIELD_TOKENS}
            activeTokens={activeChipTokens.global}
            onInsert={(token) => handleInsert("global", token)}
          />
        </div>
      </section>
      <div className="grid gap-5 md:grid-cols-2">
        <SideColumn
          title="Attacker"
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
        />
        <SideColumn
          title="Defender"
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
        />
      </div>
    </div>
  );
}
