"use client";

import { MoreHorizontal, X } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { PokemonIdentitySummary } from "@/components/pokemon/pokemon-identity-summary";
import { PokemonSprite } from "@/components/omnibar/pokemon-summary/pokemon-sprite";
import { useI18n } from "@/i18n/I18nProvider";
import { getSpeedRelevantItemMultiplier } from "@/lib/calc/speed-engine";
import { normalizeAlias } from "@/lib/data/normalization";
import type {
  PinnedSpeedComparator,
  SpeedBenchmarkIdentity,
  SpeedTierGroup,
} from "@/lib/speed/speed-benchmark";
import type { PokemonEntry } from "@/lib/types";

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

function arcStyle(distance: number) {
  const arcDistance = Math.min(Math.abs(distance), 5);

  return {
    className: "",
    style: {
      transform: `translateX(${arcDistance * 5}px) scale(${Math.max(0.92, 1 - arcDistance * 0.018)})`,
      opacity: Math.max(0.66, 1 - arcDistance * 0.06),
    },
  };
}

function getPokemonSpriteSources(pokemon: PokemonEntry) {
  const slugs = [pokemon.name, ...pokemon.aliases, pokemon.id]
    .map((value) => normalizeAlias(value).replace(/\s+/g, "-"))
    .filter((value, index, collection) => value && collection.indexOf(value) === index);

  return slugs.flatMap((slug) => [
    `https://play.pokemonshowdown.com/sprites/home/${slug}.png`,
    `https://play.pokemonshowdown.com/sprites/dex/${slug}.png`,
    `https://play.pokemonshowdown.com/sprites/gen5/${slug}.png`,
    `https://img.pokemondb.net/sprites/home/normal/${slug}.png`,
  ]);
}

function speedRelevantItem(item: string | undefined) {
  return getSpeedRelevantItemMultiplier(item) !== 1 ? item : null;
}

function LadderTile({
  group,
  setRowRef,
  distance,
  isFocused,
  isSelected,
  onSelect,
  onOpenTier,
}: {
  group: SpeedTierGroup;
  setRowRef: (element: HTMLElement | null) => void;
  distance: number;
  isFocused: boolean;
  isSelected: boolean;
  onSelect: (identity: SpeedBenchmarkIdentity) => void;
  onOpenTier: (group: SpeedTierGroup) => void;
}) {
  const { dictionary } = useI18n();
  const speed = dictionary.speedBenchmark;
  const representative = group.representative;
  const relevantItem = speedRelevantItem(representative.profile.defaultItem);
  const arc = arcStyle(distance);

  return (
    <article
      ref={setRowRef}
      data-wheel-row={group.speed}
      className={`relative z-[var(--z-content)] scroll-mt-36 rounded-lg border bg-[var(--surface-2)] p-2.5 transition-[transform,opacity,border-color,background-color,box-shadow] duration-150 [scroll-snap-align:center] ${
        relationClass(group.relation)
      } ${isSelected ? "shadow-[inset_0_0_0_1px_var(--accent)]" : ""} ${isFocused ? "border-[color:var(--accent)] bg-[var(--surface-3)]" : ""} ${arc.className}`}
      style={arc.style}
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
  const rows = useMemo(() => buildRows(groups), [groups]);
  const defaultKey = focusedGroup ? `tier-${focusedGroup.speed}` : rows[0]?.key;
  const [activeKey, setActiveKey] = useState(defaultKey);
  const activeRowIndex = rows.findIndex((row) => row.key === activeKey);
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
      rowElement.offsetTop - scrollElement.clientHeight / 2 + rowElement.clientHeight / 2;

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
      if (suppressScrollFocusTimeoutRef.current !== null) window.clearTimeout(suppressScrollFocusTimeoutRef.current);
    };
  }, []);

  return (
    <section className={`theme-panel rounded-lg p-4 ${className}`}>
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
                    <span>Base {comparator.metrics.resolvedPokemon.baseStats.spe}</span>
                    <span>{speed.effectiveSpeed} {comparator.speed}</span>
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
            {rows.map((row, index) => (
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
                  distance={index - (activeRowIndex === -1 ? 0 : activeRowIndex)}
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
          <div className="absolute bottom-4 left-3 right-8 z-[var(--z-popover)] rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3 shadow-[var(--shadow-overlay)]">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="theme-text-faint text-xs">{speed.tiedTier}</div>
                  <div className="font-semibold tabular-nums">{openTier.speed}</div>
                </div>
                <button
                  type="button"
                  aria-label={speed.clear}
                  title={speed.clear}
                  onClick={() => setOpenTier(null)}
                  className="theme-icon-button theme-icon-button-sm"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
              <div className="mt-3 max-h-72 space-y-1 overflow-auto">
                {openTier.members.map((member) => (
                  <button
                    key={member.profile.pokemonId}
                    type="button"
                    onClick={() => {
                      setOpenTier(null);
                      focusSelectedRow(rows.find((row) => row.speed === openTier.speed));
                      onSelectBenchmark(member);
                    }}
                    className="block w-full rounded px-2 py-2 text-left text-xs hover:bg-[var(--surface-3)]"
                  >
                    <span className="block font-medium">
                      {member.resolvedPokemon.name}
                    </span>
                    <span className="theme-text-faint">
                      Base {member.resolvedPokemon.baseStats.spe}
                      {speedRelevantItem(member.profile.defaultItem)
                        ? ` · ${member.profile.defaultItem}`
                        : ""}
                    </span>
                  </button>
                ))}
              </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
