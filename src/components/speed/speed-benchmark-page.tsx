"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { SpeedCommandComposer } from "@/components/speed/speed-command-composer";
import { SpeedLadder } from "@/components/speed/speed-ladder";
import { SpeedSidePanel } from "@/components/speed/speed-side-panel";
import { useI18n } from "@/i18n/I18nProvider";
import { legalPokemonData } from "@/lib/data/pokemon";
import { parseSpeedShareState } from "@/lib/share/parse-share-state";
import { serializeSpeedShareState } from "@/lib/share/serialize-share-state";
import { createSpeedSideFromPokemon } from "@/lib/speed/speed-command";
import {
  buildPinnedSpeedComparator,
  buildSpeedTierGroups,
  createSpeedSideFromBenchmark,
  describeSubjectThreshold,
  findFocusedTierIndex,
  resolveSpeedSide,
  type SpeedBenchmarkIdentity,
} from "@/lib/speed/speed-benchmark";
import { useSpeedBenchmarkStore } from "@/store/use-speed-benchmark-store";

export function SpeedBenchmarkPage() {
  const { dictionary } = useI18n();
  const speed = dictionary.speedBenchmark;
  const command = useSpeedBenchmarkStore((state) => state.command);
  const subject = useSpeedBenchmarkStore((state) => state.subject);
  const comparator = useSpeedBenchmarkStore((state) => state.comparator);
  const globals = useSpeedBenchmarkStore((state) => state.globals);
  const issues = useSpeedBenchmarkStore((state) => state.issues);
  const setCommand = useSpeedBenchmarkStore((state) => state.setCommand);
  const setSubject = useSpeedBenchmarkStore((state) => state.setSubject);
  const updateSubject = useSpeedBenchmarkStore((state) => state.updateSubject);
  const updateComparator = useSpeedBenchmarkStore((state) => state.updateComparator);
  const setComparator = useSpeedBenchmarkStore((state) => state.setComparator);
  const clearSubject = useSpeedBenchmarkStore((state) => state.clearSubject);
  const clearComparator = useSpeedBenchmarkStore((state) => state.clearComparator);
  const swapSides = useSpeedBenchmarkStore((state) => state.swapSides);
  const toggleGlobal = useSpeedBenchmarkStore((state) => state.toggleGlobal);
  const hydrateShareState = useSpeedBenchmarkStore((state) => state.hydrateShareState);
  const [copiedShareUrl, setCopiedShareUrl] = useState(false);
  const [modifiersOpen, setModifiersOpen] = useState(false);
  const [subjectSpeciesInput, setSubjectSpeciesInput] = useState("");

  const subjectMetrics = useMemo(
    () => (subject ? resolveSpeedSide(subject, globals) : null),
    [subject, globals],
  );
  const comparatorMetrics = useMemo(
    () => (comparator ? resolveSpeedSide(comparator, globals) : null),
    [comparator, globals],
  );
  const subjectSpeciesOptions = useMemo(
    () => legalPokemonData.map((entry) => entry.name).sort((left, right) => left.localeCompare(right)),
    [],
  );
  const groups = useMemo(
    () => buildSpeedTierGroups(globals, subjectMetrics?.effectiveSpeed ?? null),
    [globals, subjectMetrics?.effectiveSpeed],
  );
  const subjectSpeed = subjectMetrics?.effectiveSpeed ?? null;
  const exactSubjectTierIndex = groups.findIndex(
    (group) => subjectSpeed !== null && group.speed === subjectSpeed,
  );
  const focusedIndex = exactSubjectTierIndex !== -1
    ? exactSubjectTierIndex
    : findFocusedTierIndex(
      groups,
      subjectSpeed,
      globals.trickRoom,
    );
  const focusedGroup = groups[focusedIndex];
  const pinnedComparator = buildPinnedSpeedComparator(
    groups,
    comparatorMetrics,
    subjectMetrics?.effectiveSpeed ?? null,
    globals.trickRoom,
  );
  const thresholdBenchmarkSpeed = comparatorMetrics?.effectiveSpeed ?? focusedGroup?.speed ?? null;
  const threshold =
    subject && thresholdBenchmarkSpeed !== null
      ? describeSubjectThreshold(subject, thresholdBenchmarkSpeed, globals)
      : null;
  const thresholdStatus = subject
    ? (threshold ?? speed.thresholdUnavailable)
    : speed.thresholdEmpty;
  const subjectLabel = subjectMetrics?.resolvedPokemon.name ?? speed.subject;
  const comparatorLabel = comparatorMetrics?.resolvedPokemon.name ?? speed.comparator;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedState = parseSpeedShareState(params.get("state"));

    if (sharedState) {
      hydrateShareState(sharedState);
    }
  }, [hydrateShareState]);

  function setSpeedCommand(commandText: string) {
    setCommand(commandText);
  }

  async function copyShareUrl() {
    const encoded = serializeSpeedShareState({
      command,
      subject,
      comparator,
      globals,
      focusedTierSpeed: focusedGroup?.speed ?? null,
    });
    const url = new URL(window.location.href);
    url.pathname = "/speed";
    url.searchParams.set("state", encoded);

    await navigator.clipboard.writeText(url.toString());
    setCopiedShareUrl(true);
    window.setTimeout(() => setCopiedShareUrl(false), 1400);
  }

  const handleSelectBenchmark = useCallback((identity: SpeedBenchmarkIdentity) => {
    setComparator(createSpeedSideFromBenchmark(identity));
  }, [setComparator]);

  const handleCommitSubjectSpecies = useCallback((value: string) => {
    const normalizedValue = value.trim().toLowerCase();
    const pokemon = legalPokemonData.find((entry) =>
      entry.name.toLowerCase() === normalizedValue ||
      entry.id.toLowerCase() === normalizedValue ||
      entry.aliases.some((alias) => alias.toLowerCase() === normalizedValue),
    );

    if (!pokemon) return;

    setSubject(createSpeedSideFromPokemon(pokemon));
    setSubjectSpeciesInput("");
  }, [setSubject]);

  function explicitComparatorResult() {
    if (!subjectMetrics || !comparatorMetrics) return speed.noPokemon;

    const subjectName = subjectMetrics.resolvedPokemon.name;
    const comparatorName = comparatorMetrics.resolvedPokemon.name;

    if (subjectMetrics.effectiveSpeed === comparatorMetrics.effectiveSpeed) {
      return speed.pokemonSpeedTie(subjectName, comparatorName);
    }

    const firstMover = globals.trickRoom
      ? subjectMetrics.effectiveSpeed < comparatorMetrics.effectiveSpeed
        ? subjectName
        : comparatorName
      : subjectMetrics.effectiveSpeed > comparatorMetrics.effectiveSpeed
        ? subjectName
        : comparatorName;

    return globals.trickRoom
      ? speed.pokemonMovesFirstTrickRoom(firstMover)
      : speed.pokemonMovesFirst(firstMover);
  }

  return (
    <section className="mx-auto w-full min-w-0 max-w-7xl text-left">
      <div className="grid min-w-0 gap-4 xl:grid-cols-[300px_minmax(0,1fr)_360px] xl:items-start">
        <div className="order-2 min-w-0 xl:order-1">
          <SpeedSidePanel
            title={speed.subject}
            side={subject}
            metrics={subjectMetrics}
            onChange={updateSubject}
            onClear={clearSubject}
            showControls={false}
            speciesInput={subjectSpeciesInput || (subjectMetrics?.resolvedPokemon.name ?? "")}
            speciesOptions={subjectSpeciesOptions}
            onInputSpecies={setSubjectSpeciesInput}
            onCommitSpecies={handleCommitSubjectSpecies}
          />
        </div>

        <div className="order-1 min-w-0 xl:order-2">
          <SpeedCommandComposer
            command={command}
            subjectLabel={subjectLabel}
            comparatorLabel={comparatorLabel}
            globals={globals}
            issues={issues}
            statusText={thresholdStatus}
            copiedShareUrl={copiedShareUrl}
            canSwapSides={Boolean(comparator)}
            modifiersOpen={modifiersOpen}
            subject={subject}
            comparator={comparator}
            onCommandChange={setSpeedCommand}
            onSubjectChange={updateSubject}
            onComparatorChange={updateComparator}
            onToggleGlobal={toggleGlobal}
            onCopyShareUrl={copyShareUrl}
            onSwapSides={swapSides}
            onToggleModifiers={() => setModifiersOpen((value) => !value)}
          />

        </div>

        <div className="order-3 min-w-0">
          <SpeedLadder
            groups={groups}
            focusedGroup={focusedGroup}
            comparator={pinnedComparator}
            comparatorResultText={comparator && comparatorMetrics ? explicitComparatorResult() : null}
            onClearComparator={clearComparator}
            onSelectBenchmark={handleSelectBenchmark}
          />
        </div>
      </div>
    </section>
  );
}
