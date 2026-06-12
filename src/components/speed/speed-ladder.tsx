"use client";

import { MoreHorizontal, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { PokemonIdentitySummary } from "@/components/pokemon/pokemon-identity-summary";
import { PokemonSprite } from "@/components/omnibar/pokemon-summary/pokemon-sprite";
import { useI18n } from "@/i18n/I18nProvider";
import type { AppDictionary } from "@/i18n/types";
import { getSpeedRelevantItemMultiplier } from "@/lib/calc/speed-engine";
import { getPokemonSpriteSources } from "@/lib/pokemon-sprites";
import type {
  PinnedSpeedComparator,
  SpeedBenchmarkIdentity,
  SpeedTierGroup,
} from "@/lib/speed/speed-benchmark";

function relationClass(relation: SpeedTierGroup["relation"]) {
  if (relation === "subject-first") {
    return "border-[color:var(--outcome-favorable)]";
  }

  if (relation === "benchmark-first") {
    return "border-[color:var(--outcome-unfavorable)]";
  }

  if (relation === "tie") {
    return "border-[color:var(--outcome-tie)]";
  }

  return "border-[color:var(--outcome-neutral)]";
}

function relationLabel(
  relation: SpeedTierGroup["relation"],
  labels: AppDictionary["speedBenchmark"],
) {
  if (relation === "subject-first") return labels.subjectFirst;
  if (relation === "benchmark-first") return labels.benchmarkFirst;
  if (relation === "tie") return labels.speedTie;

  return labels.referenceTier;
}

function speedRelevantItem(item: string | undefined) {
  return getSpeedRelevantItemMultiplier(item) !== 1 ? item : null;
}

function LadderTile({
  group,
  setRowRef,
  isFocused,
  isSelected,
  onSelect,
  onOpenTier,
}: {
  group: SpeedTierGroup;
  setRowRef: (element: HTMLElement | null) => void;
  isFocused: boolean;
  isSelected: boolean;
  onSelect: (identity: SpeedBenchmarkIdentity) => void;
  onOpenTier: (group: SpeedTierGroup) => void;
}) {
  const { dictionary } = useI18n();
  const speed = dictionary.speedBenchmark;
  const representative = group.representative;
  const relevantItem = speedRelevantItem(representative.item);
  return (
    <article
      ref={setRowRef}
      data-wheel-row={group.speed}
      className={`relative z-[var(--z-content)] scroll-mt-36 rounded-lg border bg-[var(--surface-2)] p-2.5 transition-[border-color,background-color,box-shadow] duration-150 [scroll-snap-align:center] ${relationClass(
        group.relation,
      )} ${isSelected ? "shadow-[inset_0_0_0_1px_var(--accent)]" : ""} ${isFocused ? "border-[color:var(--accent)] bg-[var(--surface-3)]" : ""}`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSelect(representative)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="theme-summary-sprite-shell flex h-11 w-11 shrink-0 items-center justify-center rounded-md p-1.5">
            <PokemonSprite
              sources={getPokemonSpriteSources(representative.resolvedPokemon)}
              name={representative.resolvedPokemon.name}
              primaryType={representative.resolvedPokemon.types[0] ?? null}
              loading="lazy"
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              {representative.resolvedPokemon.name}
            </span>
            <span className="theme-text-faint mt-0.5 block truncate text-xs">
              Base {representative.resolvedPokemon.baseStats.spe}
              {relevantItem ? ` · ${relevantItem}` : ""}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className="theme-text-faint block text-[11px]">
              {speed.effectiveSpeed}
            </span>
            <span className="block text-xl font-semibold tabular-nums">
              {group.speed}
            </span>
            <span className="theme-speed-relation mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-medium">
              {relationLabel(group.relation, speed)}
            </span>
          </span>
        </button>

        {group.members.length > 1 ? (
          <button
            type="button"
            onClick={() => onOpenTier(group)}
            className="theme-icon-button theme-icon-button-sm shrink-0"
            aria-label={speed.otherPokemon(group.members.length - 1)}
            title={speed.otherPokemon(group.members.length - 1)}
          >
            <MoreHorizontal size={15} aria-hidden="true" />
          </button>
        ) : (
          <span className="h-8 w-8 shrink-0" aria-hidden="true" />
        )}
      </div>
    </article>
  );
}

interface LadderRow {
  key: string;
  speed: number;
  group: SpeedTierGroup;
}

function buildRows(groups: SpeedTierGroup[]) {
  return groups.map((group) => ({
    key: `tier-${group.speed}`,
    speed: group.speed,
    group,
  }));
}

interface SpeedLadderProps {
  groups: SpeedTierGroup[];
  focusedGroup: SpeedTierGroup | undefined;
  comparator: PinnedSpeedComparator | null;
  comparatorResultText?: string | null;
  onClearComparator?: () => void;
  onSelectBenchmark: (identity: SpeedBenchmarkIdentity) => void;
  className?: string;
}

export function SpeedLadder({
  groups,
  focusedGroup,
  comparator,
  comparatorResultText,
  onClearComparator,
  onSelectBenchmark,
  className = "",
}: SpeedLadderProps) {
  const { dictionary } = useI18n();
  const speed = dictionary.speedBenchmark;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef(new Map<string, HTMLElement>());
  const rafRef = useRef<number | null>(null);
  const suppressScrollFocusTimeoutRef = useRef<number | null>(null);
  const [openTier, setOpenTier] = useState<SpeedTierGroup | null>(null);
  const openTierTitleId = useId();
  const rows = useMemo(() => buildRows(groups), [groups]);
  const defaultKey = focusedGroup ? `tier-${focusedGroup.speed}` : rows[0]?.key;
  const [activeKey, setActiveKey] = useState(defaultKey);
  const selectedSpeed = comparator?.speed ?? null;

  function focusCenteredRow(row: LadderRow | undefined) {
    if (!row) return;

    setActiveKey(row.key);
  }

  function suppressScrollFocus(duration = 220) {
    if (suppressScrollFocusTimeoutRef.current !== null) {
      window.clearTimeout(suppressScrollFocusTimeoutRef.current);
    }

    suppressScrollFocusTimeoutRef.current = window.setTimeout(() => {
      suppressScrollFocusTimeoutRef.current = null;
    }, duration);
  }

  function scrollLadderToRow(row: LadderRow | undefined) {
    const scrollElement = scrollRef.current;
    const rowElement = row ? rowRefs.current.get(row.key) : null;
    if (!scrollElement || !rowElement) return;

    const targetTop =
      rowElement.offsetTop -
      scrollElement.clientHeight / 2 +
      rowElement.clientHeight / 2;

    scrollElement.scrollTo({ top: targetTop });
  }

  function focusSelectedRow(row: LadderRow | undefined) {
    if (!row) return;

    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    setActiveKey(row.key);

    // Clicking a tile should make that tier the focused tier, but should not let
    // an incidental scroll-snap event immediately overwrite focus with the row
    // currently nearest the viewport center.
    suppressScrollFocus();
  }

  function updateCenteredRow() {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const viewport = scrollElement.getBoundingClientRect();
    const viewportCenter = viewport.top + viewport.height / 2;
    let closestRow: LadderRow | undefined;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const row of rows) {
      const element = rowRefs.current.get(row.key);
      if (!element) continue;

      const rect = element.getBoundingClientRect();
      const distance = Math.abs(rect.top + rect.height / 2 - viewportCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestRow = row;
      }
    }

    if (closestRow && closestRow.key !== activeKey) {
      focusCenteredRow(closestRow);
    }
  }

  function handleWheelScroll() {
    if (suppressScrollFocusTimeoutRef.current !== null) {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      return;
    }

    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      updateCenteredRow();
    });
  }

  useEffect(() => {
    if (!defaultKey) return;

    const row = rows.find((entry) => entry.key === defaultKey);
    const frame = window.requestAnimationFrame(() => {
      if (row) {
        setActiveKey(row.key);
        suppressScrollFocus();
        scrollLadderToRow(row);
      }
    });

    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultKey]); // intentionally omits `rows` — rows rebuild on every render but
  // defaultKey changing is the only signal that needs auto-scroll

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      if (suppressScrollFocusTimeoutRef.current !== null)
        window.clearTimeout(suppressScrollFocusTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!openTier) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenTier(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openTier]);

  return (
    <section className={`theme-support-panel rounded-lg p-4 ${className}`}>
      <div>
        <h2 className="text-sm font-semibold">{speed.benchmarkLadder}</h2>
        <p className="theme-text-faint mt-0.5 text-xs">{speed.baselineLabel}</p>
      </div>

      <div className="relative">
        {comparator ? (
          <div className="theme-subpanel absolute left-1 right-3 top-3 z-[var(--z-popover)] rounded-lg p-3 shadow-[var(--shadow-overlay)]">
            <div className="flex items-start justify-between gap-2">
              <PokemonIdentitySummary
                pokemon={comparator.metrics.pokemon}
                resolvedPokemon={comparator.metrics.resolvedPokemon}
                eyebrow={speed.comparator}
                showOrigin={false}
                meta={
                  <div className="theme-text-faint flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    <span>
                      Base {comparator.metrics.resolvedPokemon.baseStats.spe}
                    </span>
                    {speedRelevantItem(comparator.metrics.item) ? (
                      <span>{speedRelevantItem(comparator.metrics.item)}</span>
                    ) : null}
                    <span>
                      {speed.effectiveSpeed} {comparator.speed}
                    </span>
                    {!comparator.matchesGeneratedTier ? (
                      <span>{speed.pinnedOffTier}</span>
                    ) : null}
                  </div>
                }
              />
              {onClearComparator ? (
                <button
                  type="button"
                  aria-label={speed.clear}
                  title={speed.clear}
                  onClick={onClearComparator}
                  className="theme-icon-button theme-icon-button-sm shrink-0"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              ) : null}
            </div>
            {comparatorResultText ? (
              <div className="mt-3 text-sm">{comparatorResultText}</div>
            ) : null}
          </div>
        ) : null}

        <div
          ref={scrollRef}
          onScroll={handleWheelScroll}
          className="relative mt-4 h-[36rem] max-h-[72vh] overflow-y-auto overflow-x-hidden px-1 pb-40 pt-52 pr-6 scroll-pb-40 scroll-pt-52 [scroll-snap-type:y_mandatory]"
        >
          <div className="space-y-2">
            {rows.map((row) => (
              <LadderTile
                key={row.key}
                group={row.group}
                setRowRef={(element) => {
                  if (element) {
                    rowRefs.current.set(row.key, element);
                  } else {
                    rowRefs.current.delete(row.key);
                  }
                }}

                isFocused={row.key === activeKey}
                isSelected={row.speed === selectedSpeed}
                onSelect={(identity) => {
                  focusSelectedRow(row);
                  onSelectBenchmark(identity);
                }}
                onOpenTier={setOpenTier}
              />
            ))}
          </div>
        </div>

        {openTier ? (
          <div
            role="dialog"
            aria-labelledby={openTierTitleId}
            className="theme-speed-tier-popover absolute bottom-4 left-3 right-8 z-[var(--z-popover)] rounded-xl p-3 shadow-[var(--shadow-overlay)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="theme-data-label">{speed.tiedTier}</div>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h3
                    id={openTierTitleId}
                    className="text-xl font-semibold tabular-nums"
                  >
                    {openTier.speed}
                  </h3>
                  <span className="theme-speed-relation rounded px-1.5 py-0.5 text-[11px] font-medium">
                    {openTier.members.length} Pokemon
                  </span>
                </div>
              </div>
              <button
                type="button"
                aria-label={speed.clear}
                title={speed.clear}
                onClick={() => setOpenTier(null)}
                className="theme-icon-button theme-icon-button-sm shrink-0"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-3 max-h-72 space-y-1.5 overflow-auto pr-1">
              {openTier.members.map((member) => {
                const relevantItem = speedRelevantItem(
                  member.item,
                );

                return (
                  <button
                    key={`${member.profile.pokemonId}-${member.item ?? "baseline"}-${member.speed}`}
                    type="button"
                    onClick={() => {
                      setOpenTier(null);
                      focusSelectedRow(
                        rows.find((row) => row.speed === openTier.speed),
                      );
                      onSelectBenchmark(member);
                    }}
                    className="theme-speed-tier-option grid w-full grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg p-2 text-left"
                  >
                    <span className="theme-summary-sprite-shell flex h-9 w-9 shrink-0 items-center justify-center rounded-md p-1.5">
                      <PokemonSprite
                        sources={getPokemonSpriteSources(
                          member.resolvedPokemon,
                        )}
                        name={member.resolvedPokemon.name}
                        primaryType={member.resolvedPokemon.types[0] ?? null}
                        loading="lazy"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {member.resolvedPokemon.name}
                      </span>
                      <span className="theme-text-faint block truncate text-xs">
                        Base {member.resolvedPokemon.baseStats.spe}
                        {relevantItem ? ` · ${relevantItem}` : ""}
                      </span>
                    </span>
                    <span className="theme-data-text text-[12px] tabular-nums">
                      {openTier.speed}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
