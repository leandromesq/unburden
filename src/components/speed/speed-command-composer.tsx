"use client";

import { ArrowLeftRight, Clipboard, Settings2, X } from "lucide-react";
import { useMemo, useRef, useState, type RefObject } from "react";

import { SpeedHelpBubble } from "@/components/speed/speed-help-bubble";
import { SpeedPromptTextarea } from "@/components/speed/speed-prompt-textarea";
import {
  applySpeedAutocompleteOption,
  getSpeedAutocompleteOptions,
  type SpeedAutocompleteOption,
} from "@/lib/speed/speed-autocomplete";
import { useI18n } from "@/i18n/I18nProvider";
import { resolveSpeedSide } from "@/lib/speed/speed-benchmark";
import type { SpeedGlobalState, SpeedSideState } from "@/lib/types";

function addOverride(side: SpeedSideState, value: string) {
  return side.overrides.includes(value) ? side.overrides : [...side.overrides, value];
}

function removeOverride(side: SpeedSideState, value: string) {
  return side.overrides.filter((override) => override !== value);
}

function SpeedSideModifiers({
  title,
  side,
  globals,
  onChange,
}: {
  title: string;
  side: SpeedSideState | null;
  globals: SpeedGlobalState;
  onChange: (patch: Partial<SpeedSideState>) => void;
}) {
  const { dictionary } = useI18n();
  const speed = dictionary.speedBenchmark;
  const metrics = side ? resolveSpeedSide(side, globals) : null;
  const disabled = !side || !metrics;
  const abilities = metrics?.resolvedPokemon.abilities ?? [];

  return (
    <section className={`min-w-0 ${disabled ? "opacity-75" : ""}`}>
      <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
        <div className="theme-section-title">{title}</div>
        <div className="theme-section-meta min-w-0 truncate">
          {metrics?.resolvedPokemon.name ?? speed.noPokemon}
        </div>
      </div>
      <div className="grid gap-4">
        <section className="min-w-0">
          <div className="grid gap-3">
            <label className="block">
              <span className="theme-text-faint">{speed.speSp}: {side?.speSp ?? 32}</span>
              <input
                type="range"
                min={0}
                max={32}
                disabled={disabled}
                value={side?.speSp ?? 32}
                onChange={(event) => onChange({ speSp: Number(event.currentTarget.value) })}
                className="mt-2 w-full accent-[var(--accent)] disabled:cursor-not-allowed"
              />
            </label>
            <div className="theme-divider border-t pt-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="theme-text-faint text-sm">{speed.stage}</div>
              </div>
              <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] gap-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => side && onChange({ speedStage: Math.max(-6, side.speedStage - 1) })}
                  className="theme-icon-button theme-icon-button-sm disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={`${speed.stage} -1`}
                >
                  -
                </button>
                <input
                  aria-label={`${title} ${speed.stage}`}
                  type="number"
                  min={-6}
                  max={6}
                  disabled={disabled}
                  value={side?.speedStage ?? 0}
                  onChange={(event) => {
                    const value = Number(event.currentTarget.value);
                    onChange({ speedStage: Math.max(-6, Math.min(6, value)) });
                  }}
                  className="theme-control h-8 w-full rounded px-2 text-center text-sm tabular-nums disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => side && onChange({ speedStage: Math.min(6, side.speedStage + 1) })}
                  className="theme-icon-button theme-icon-button-sm disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={`${speed.stage} +1`}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </section>
        <section className="theme-divider border-t pt-4">
          <div className="grid gap-4">
            <div>
              <div className="theme-text-dim mb-2 min-w-0 break-words text-[13px] font-medium leading-5">{speed.ability}</div>
              <select
                aria-label={`${title} ${speed.ability}`}
                disabled={disabled}
                value={side?.ability ?? ""}
                onChange={(event) => {
                  if (!side) return;
                  const ability = event.currentTarget.value || undefined;
                  onChange({ ability, overrides: ability ? addOverride(side, ability) : side.overrides });
                }}
                className="theme-control h-9 w-full rounded px-2 text-sm disabled:cursor-not-allowed"
              >
                {abilities.map((ability) => (
                  <option key={ability} value={ability}>{ability}</option>
                ))}
              </select>
            </div>
            <div className="theme-divider border-t pt-4">
              <div className="theme-text-dim mb-2 min-w-0 break-words text-[13px] font-medium leading-5">{speed.nature}</div>
              <div className="flex flex-wrap items-start gap-2">
                {([["minus", speed.minusNature], ["neutral", speed.neutralNature], ["plus", speed.plusNature]] as const).map(([nature, label]) => (
                  <button
                    key={nature}
                    type="button"
                    aria-pressed={side?.nature === nature}
                    disabled={disabled}
                    onClick={() => onChange({ nature })}
                    className={`max-w-full rounded-md px-3 py-1.5 text-left text-sm leading-4 ${side?.nature === nature ? "theme-chip-active" : disabled ? "theme-chip-disabled cursor-not-allowed" : "theme-chip"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="theme-divider border-t pt-4">
              <div className="theme-text-dim mb-2 min-w-0 break-words text-[13px] font-medium leading-5">{dictionary.modifierSwitches.battleEffects}</div>
              <div className="flex flex-wrap items-start gap-2">
                <button type="button" aria-pressed={Boolean(side?.tailwind)} disabled={disabled} onClick={() => side && onChange({ tailwind: !side.tailwind })} className={`max-w-full rounded-md px-3 py-1.5 text-left text-sm leading-4 ${side?.tailwind ? "theme-chip-active" : disabled ? "theme-chip-disabled cursor-not-allowed" : "theme-chip"}`}>{speed.tailwind}</button>
                <button type="button" aria-pressed={side?.item === "Choice Scarf"} disabled={disabled} onClick={() => side && onChange({ item: side.item === "Choice Scarf" ? undefined : "Choice Scarf", overrides: side.item === "Choice Scarf" ? removeOverride(side, "Choice Scarf") : addOverride(side, "Choice Scarf") })} className={`max-w-full rounded-md px-3 py-1.5 text-left text-sm leading-4 ${side?.item === "Choice Scarf" ? "theme-chip-active" : disabled ? "theme-chip-disabled cursor-not-allowed" : "theme-chip"}`}>{speed.choiceScarf}</button>
                <button type="button" aria-pressed={Boolean(side?.paralysis)} disabled={disabled} onClick={() => side && onChange({ paralysis: !side.paralysis })} className={`max-w-full rounded-md px-3 py-1.5 text-left text-sm leading-4 ${side?.paralysis ? "theme-chip-active" : disabled ? "theme-chip-disabled cursor-not-allowed" : "theme-chip"}`}>{speed.paralysis}</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

function SuggestionBar({
  options,
  highlightedIndex,
  onApply,
  textareaRef,
}: {
  options: SpeedAutocompleteOption[];
  highlightedIndex: number;
  onApply: (option: SpeedAutocompleteOption) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}) {
  if (!options.length) return null;

  return (
    <div className="border-t theme-divider flex flex-wrap gap-2 px-4 py-3 md:px-5">
      {options.slice(0, 6).map((option, index) => (
        <button
          key={`${option.type}-${option.value}-${option.replaceFrom}`}
          type="button"
          aria-pressed={highlightedIndex === index}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            onApply(option);
            requestAnimationFrame(() => {
              const element = textareaRef.current;
              if (!element) return;
              const cursor = element.value.length;
              element.focus();
              element.setSelectionRange(cursor, cursor);
            });
          }}
          className={`inline-flex max-w-full min-w-0 items-center overflow-hidden rounded-md px-3 py-1.5 text-sm ${
            highlightedIndex === index ? "theme-chip-active" : "theme-chip"
          }`}
        >
          <span
            className="min-w-0 truncate font-mono text-[12px]"
            style={{ color: "var(--text)" }}
          >
            {option.value}
          </span>
          {option.detail || option.label !== option.value ? (
            <span className="theme-text-dim ml-2 truncate text-[11px]">
              {option.detail ?? option.label}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

interface SpeedCommandComposerProps {
  command: string;
  subjectLabel: string;
  comparatorLabel: string;
  globals: SpeedGlobalState;
  issues: string[];
  statusText: string;
  copiedShareUrl: boolean;
  canSwapSides: boolean;
  modifiersOpen: boolean;
  subject: SpeedSideState | null;
  comparator: SpeedSideState | null;
  onCommandChange: (command: string) => void;
  onSubjectChange: (patch: Partial<SpeedSideState>) => void;
  onComparatorChange: (patch: Partial<SpeedSideState>) => void;
  onToggleGlobal: (key: keyof SpeedGlobalState) => void;
  onCopyShareUrl: () => void;
  onSwapSides: () => void;
  onToggleModifiers: () => void;
}

export function SpeedCommandComposer({
  command,
  subjectLabel,
  comparatorLabel,
  globals,
  issues,
  statusText,
  copiedShareUrl,
  canSwapSides,
  modifiersOpen,
  subject,
  comparator,
  onCommandChange,
  onSubjectChange,
  onComparatorChange,
  onToggleGlobal,
  onCopyShareUrl,
  onSwapSides,
  onToggleModifiers,
}: SpeedCommandComposerProps) {
  const { dictionary } = useI18n();
  const speed = dictionary.speedBenchmark;
  const modifierLabels = dictionary.modifierSwitches;
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestions = useMemo(
    () => getSpeedAutocompleteOptions(command),
    [command],
  );
  const visibleSuggestions = command.trim() ? suggestions : [];

  function applySuggestion(option: SpeedAutocompleteOption) {
    onCommandChange(applySpeedAutocompleteOption(command, option));
    setHighlightedSuggestionIndex(0);
  }

  function moveSuggestion(delta: number) {
    if (!visibleSuggestions.length) return;
    setHighlightedSuggestionIndex((index) =>
      (index + delta + visibleSuggestions.length) % visibleSuggestions.length,
    );
  }

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <button
            type="button"
            aria-label={speed.copyShareUrl}
            title={copiedShareUrl ? speed.copiedShareUrl : speed.copyShareUrl}
            onClick={onCopyShareUrl}
            className={`theme-icon-button theme-icon-button-sm text-sm ${
              copiedShareUrl ? "theme-icon-button-active" : ""
            }`}
          >
            <Clipboard size={14} aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <button
            type="button"
            aria-expanded={modifiersOpen}
            aria-label={dictionary.home.toggleModifiers}
            onClick={onToggleModifiers}
            className={`theme-toolbar-button gap-1 text-sm whitespace-nowrap ${
              modifiersOpen ? "theme-icon-button-active" : "theme-icon-button"
            }`}
          >
            <span
              className="t-icon-swap"
              data-state={modifiersOpen ? "b" : "a"}
              aria-hidden="true"
            >
              <Settings2
                className="t-icon"
                data-icon="a"
                size={14}
                strokeWidth={1.9}
              />
              <X
                className="t-icon"
                data-icon="b"
                size={14}
                strokeWidth={2.1}
              />
            </span>
            <span>{dictionary.home.modifiers}</span>
          </button>
          <button
            type="button"
            aria-label={dictionary.home.swapSides}
            aria-keyshortcuts="Alt+X"
            onClick={() => {
              if (canSwapSides) onSwapSides();
            }}
            className="theme-icon-button theme-icon-button-sm px-2.5 text-sm"
          >
            <ArrowLeftRight aria-hidden="true" size={14} strokeWidth={1.9} />
          </button>
          <SpeedHelpBubble />
        </div>
      </div>

      <div className="theme-composer min-w-0 rounded-xl">
        <div className="theme-composer-top relative">
          <div className="theme-workbench-strip flex items-center gap-2 px-4 py-2 md:px-5">
            <div className="theme-workbench-segment flex min-w-0 flex-1 flex-col rounded-md px-3 py-1.5">
              <span>{speed.subject}</span>
              <strong className="truncate">{subjectLabel}</strong>
            </div>
            <div className="theme-data-text rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1 text-[12px]">
              x
            </div>
            <div className="theme-workbench-segment flex min-w-0 flex-1 flex-col rounded-md px-3 py-1.5 text-right">
              <span>{speed.comparator}</span>
              <strong className="truncate">{comparatorLabel}</strong>
            </div>
          </div>

          <SpeedPromptTextarea
            value={command}
            suggestions={visibleSuggestions}
            highlightedSuggestionIndex={highlightedSuggestionIndex}
            textareaRef={textareaRef}
            onChange={(value) => {
              onCommandChange(value);
              setHighlightedSuggestionIndex(0);
            }}
            onClear={() => {
              onCommandChange("");
              setHighlightedSuggestionIndex(0);
            }}
            onMoveSuggestion={moveSuggestion}
            onApplySuggestion={applySuggestion}
            onSwapSides={onSwapSides}
          />

          <SuggestionBar
            options={visibleSuggestions}
            highlightedIndex={highlightedSuggestionIndex}
            onApply={applySuggestion}
            textareaRef={textareaRef}
          />

          <div
            className="theme-status px-5 py-3 text-sm"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {issues.length ? issues.join(" ") : statusText}
          </div>
        </div>

        {modifiersOpen ? (
        <div className="theme-composer-secondary">
          <div className="min-w-0 px-4 py-4 md:px-5 md:py-5">
            <section className="min-w-0 border-b border-[var(--line)] pb-5">
              <div className="mb-3">
                <div className="theme-section-title">{modifierLabels.global}</div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {([
                  [modifierLabels.weather, [["sun", speed.sun], ["rain", speed.rain], ["sand", speed.sand], ["snow", speed.snow]]],
                  [modifierLabels.terrain, [["electricTerrain", speed.electricTerrain]]],
                  [modifierLabels.fieldEffects, [["trickRoom", speed.trickRoom]]],
                ] as const).map(([groupLabel, options]) => (
                  <section key={groupLabel} className="min-w-0">
                    <div className="theme-text-dim mb-2 min-w-0 break-words text-[13px] font-medium leading-5">
                      {groupLabel}
                    </div>
                    <div className="flex flex-wrap items-start gap-2">
                      {options.map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          aria-pressed={globals[key]}
                          onClick={() => onToggleGlobal(key)}
                          className={`max-w-full rounded-md px-3 py-1.5 text-left text-sm leading-4 whitespace-normal break-words ${
                            globals[key] ? "theme-chip-active" : "theme-chip"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </section>
            <div className="mt-5 grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <SpeedSideModifiers
                title={speed.subject}
                side={subject}
                globals={globals}
                onChange={onSubjectChange}
              />
              <div className="min-w-0 md:border-l md:border-[var(--line)] md:pl-5">
                <SpeedSideModifiers
                  title={speed.comparator}
                  side={comparator}
                  globals={globals}
                  onChange={onComparatorChange}
                />
              </div>
            </div>
          </div>
        </div>
        ) : null}
      </div>

    </>
  );
}
