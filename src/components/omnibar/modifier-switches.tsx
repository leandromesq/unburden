"use client";

import type { RefObject, ReactNode } from "react";

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

interface ModifierSwitchesProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
      {children}
    </div>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
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
      tabIndex={-1}
      disabled={disabled || active}
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-sm transition ${
        active
          ? "cursor-default border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
          : disabled
            ? "cursor-not-allowed border-zinc-800 bg-zinc-950/50 text-zinc-600"
            : "border-zinc-700 bg-zinc-900/85 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
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
    <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/45 p-3">
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
        <div className="text-sm text-zinc-600">{emptyText ?? "No options yet."}</div>
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
    <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/45 p-3">
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
          tabIndex={-1}
          disabled={disabled || value === null}
          onClick={() => onChange(null)}
          className="rounded-full border border-zinc-700 bg-zinc-900/85 px-3 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-950/50 disabled:text-zinc-600"
        >
          Reset
        </button>
      </div>
      <div className="mt-2 text-sm text-zinc-500">
        {value === null ? "Default: full HP" : `Using ${value}% current HP`}
      </div>
    </section>
  );
}

function StageControl({
  title,
  scope,
  value,
  disabled,
  onChange,
}: {
  title: string;
  scope: "attacker" | "defender";
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const accentClass =
    scope === "attacker" ? "accent-emerald-400" : "accent-sky-400";
  const badgeClass =
    scope === "attacker"
      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
      : "border-sky-400/25 bg-sky-400/10 text-sky-200";

  return (
    <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/45 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <GroupLabel>{title}</GroupLabel>
        <div
          className={`rounded-full border px-2.5 py-1 font-mono text-xs ${badgeClass}`}
        >
          {value > 0 ? `+${value}` : value}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled || value <= -6}
          className="h-9 w-9 rounded-full border border-zinc-700 bg-zinc-900/85 text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-950/50 disabled:text-zinc-600"
          onClick={() => onChange(Math.max(-6, value - 1))}
        >
          -
        </button>
        <div className="flex-1">
          <input
            aria-label={`${scope} stage slider`}
            type="range"
            min={-6}
            max={6}
            step={1}
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(Number(event.currentTarget.value))}
            className={`h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 ${accentClass} disabled:cursor-not-allowed`}
          />
          <div className="mt-2 flex justify-between font-mono text-[11px] text-zinc-500">
            <span>-6</span>
            <span>0</span>
            <span>+6</span>
          </div>
        </div>
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled || value >= 6}
          className="h-9 w-9 rounded-full border border-zinc-700 bg-zinc-900/85 text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-950/50 disabled:text-zinc-600"
          onClick={() => onChange(Math.min(6, value + 1))}
        >
          +
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-sm text-zinc-500">
          {scope === "attacker" ? "Atk / SpA stage" : "Def / SpD stage"}
        </div>
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled || value === 0}
          className="rounded-full border border-zinc-700 bg-zinc-900/85 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-950/50 disabled:text-zinc-600"
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
  disabled,
  stageValue,
  hpPercent,
  statTokens,
  effectTokens,
  abilityTokens,
  onInsert,
  onStageChange,
  onHpChange,
}: {
  title: string;
  activeTokens: string[];
  disabled?: boolean;
  stageValue: number;
  hpPercent: number | null;
  statTokens: Array<{ token: string; label: string }>;
  effectTokens: Array<{ token: string; label: string }>;
  abilityTokens: Array<{ token: string; label: string }>;
  onInsert: (token: string) => void;
  onStageChange: (value: number) => void;
  onHpChange: (value: number | null) => void;
}) {
  return (
    <section className="rounded-[28px] border border-zinc-800/80 bg-zinc-950/50 p-4">
      <SectionLabel>{title}</SectionLabel>
      <div className="grid gap-3">
        <StageControl
          title="Multipliers"
          scope={title.toLowerCase() as "attacker" | "defender"}
          value={stageValue}
          disabled={disabled}
          onChange={onStageChange}
        />
        <TokenGroup
          title="Stats"
          tokens={statTokens}
          activeTokens={activeTokens}
          disabled={disabled}
          onInsert={onInsert}
        />
        <HpPercentageControl
          value={hpPercent}
          disabled={disabled}
          onChange={onHpChange}
        />
        <TokenGroup
          title="Move Effects"
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
          emptyText={disabled ? "Resolve this side first." : "No ability suggestions."}
        />
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

export function ModifierSwitches({ textareaRef }: ModifierSwitchesProps) {
  const input = useOmniStore((state) => state.input);
  const activeChipTokens = useOmniStore((state) => state.activeChipTokens);
  const insertChip = useOmniStore((state) => state.insertChip);
  const setStatModifier = useOmniStore((state) => state.setStatModifier);
  const setHpPercentage = useOmniStore((state) => state.setHpPercentage);
  const structure = analyzeCommandStructure(input);
  const attackerResolved = structure.attacker.speciesExact ?? structure.attacker.speciesMatch;
  const defenderResolved = structure.defender.speciesExact ?? structure.defender.speciesMatch;
  const defenderReady = Boolean(structure.lexed.hasDelimiter && defenderResolved);
  const attackerHpPercent = structure.attacker.hpToken
    ? Number(structure.attacker.hpToken.value)
    : null;
  const defenderHpPercent = structure.defender.hpToken
    ? Number(structure.defender.hpToken.value)
    : null;

  const attackerStage = Math.max(
    -6,
    Math.min(
      6,
      structure.attacker.modifierTokens.reduce((sum, token) => {
        const definition = ATTACKER_MODIFIER_MAP.get(token.value);
        return definition?.kind === "stat_mod" ? sum + (definition.statMod ?? 0) : sum;
      }, 0),
    ),
  );
  const defenderStage = Math.max(
    -6,
    Math.min(
      6,
      structure.defender.modifierTokens.reduce((sum, token) => {
        const definition = DEFENDER_MODIFIER_MAP.get(token.value);
        return definition?.kind === "stat_mod" ? sum + (definition.statMod ?? 0) : sum;
      }, 0),
    ),
  );

  const focusTextarea = () => {
    requestAnimationFrame(() => {
      const element = textareaRef.current;
      if (!element) {
        return;
      }

      const cursor = element.value.length;
      element.focus();
      element.setSelectionRange(cursor, cursor);
    });
  };

  const attackerAbilityTokens = attackerResolved
    ? getSuggestedAbilities(attackerResolved.entry.id, "", 4).map((ability) => ({
        token: formatAbilityToken("attacker", ability),
        label: ability,
      }))
    : [];
  const defenderAbilityTokens = defenderResolved
    ? getSuggestedAbilities(defenderResolved.entry.id, "", 4).map((ability) => ({
        token: formatAbilityToken("defender", ability),
        label: ability,
      }))
    : [];

  const handleInsert = (scope: "attacker" | "defender" | "global", token: string) => {
    insertChip(scope, token);
    focusTextarea();
  };

  const handleStageChange = (scope: "attacker" | "defender", value: number) => {
    setStatModifier(scope, value);
    focusTextarea();
  };
  const handleHpChange = (scope: "attacker" | "defender", value: number | null) => {
    setHpPercentage(scope, value);
    focusTextarea();
  };

  return (
    <div className="border-t border-zinc-800/80 px-4 py-4">
      <section className="mb-5 rounded-[28px] border border-zinc-800/80 bg-zinc-950/50 p-4">
        <SectionLabel>Global</SectionLabel>
        <div className="grid gap-3 md:grid-cols-3">
          <TokenGroup
            title="Weather"
            tokens={toGroupTokens(
              "global",
              GLOBAL_CHIP_DEFINITIONS.filter((definition) => definition.section === "weather"),
            )}
            activeTokens={activeChipTokens.global}
            onInsert={(token) => handleInsert("global", token)}
          />
          <TokenGroup
            title="Terrain"
            tokens={toGroupTokens(
              "global",
              GLOBAL_CHIP_DEFINITIONS.filter((definition) => definition.section === "terrain"),
            )}
            activeTokens={activeChipTokens.global}
            onInsert={(token) => handleInsert("global", token)}
          />
          <TokenGroup
            title="Field Effects"
            tokens={toGroupTokens(
              "global",
              GLOBAL_CHIP_DEFINITIONS.filter(
                (definition) => definition.section === "field_effects",
              ),
            )}
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
          hpPercent={attackerHpPercent}
          statTokens={toGroupTokens(
            "attacker",
            ATTACKER_CHIP_DEFINITIONS.filter((definition) => definition.section === "stats"),
          )}
          effectTokens={toGroupTokens(
            "attacker",
            ATTACKER_CHIP_DEFINITIONS.filter(
              (definition) => definition.section === "move_effects",
            ),
          )}
          abilityTokens={attackerAbilityTokens}
          onInsert={(token) => handleInsert("attacker", token)}
          onStageChange={(value) => handleStageChange("attacker", value)}
          onHpChange={(value) => handleHpChange("attacker", value)}
        />
        <SideColumn
          title="Defender"
          activeTokens={activeChipTokens.defender}
          disabled={!defenderReady}
          stageValue={defenderStage}
          hpPercent={defenderHpPercent}
          statTokens={toGroupTokens(
            "defender",
            DEFENDER_CHIP_DEFINITIONS.filter((definition) => definition.section === "stats"),
          )}
          effectTokens={toGroupTokens(
            "defender",
            DEFENDER_CHIP_DEFINITIONS.filter(
              (definition) => definition.section === "move_effects",
            ),
          )}
          abilityTokens={defenderAbilityTokens}
          onInsert={(token) => handleInsert("defender", token)}
          onStageChange={(value) => handleStageChange("defender", value)}
          onHpChange={(value) => handleHpChange("defender", value)}
        />
      </div>
    </div>
  );
}
