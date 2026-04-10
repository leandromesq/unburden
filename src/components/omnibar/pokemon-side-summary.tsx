"use client";

import { useMemo, useState } from "react";

import {
  itemDisplayById,
  moveById,
  normalizeAlias,
  normalizeId,
  resolveMegaEvolution,
} from "@/lib/data/loaders";
import { analyzeCommandStructure } from "@/lib/parser/command-structure";
import { buildCommonAbilities } from "@/lib/parser/grammar";
import { resolveMoveEntity } from "@/lib/parser/fuse-indexes";
import { inferDefaultAbility } from "@/lib/parser/inference";
import { useOmniStore } from "@/store/use-omni-store";

type SummarySide = "attacker" | "defender";

function resolveParsedSpecies(
  segment: ReturnType<typeof analyzeCommandStructure>["attacker"],
) {
  if (segment.speciesExact) {
    return segment.speciesExact.entry;
  }

  if (segment.leadingRemainderTokens.length === 0) {
    return segment.speciesMatch?.entry ?? null;
  }

  return null;
}

function resolveMoveName(moveInput: string | undefined) {
  if (!moveInput) {
    return null;
  }

  const exact = moveById.get(normalizeId(moveInput));
  if (exact) {
    return exact.name;
  }

  return resolveMoveEntity(moveInput.replace(/-/g, " "))?.entry.name ?? null;
}

function resolveAbilityDisplay(
  pokemon: ReturnType<typeof resolveParsedSpecies>,
  explicitAbility: string | undefined,
) {
  if (!pokemon) {
    return null;
  }

  if (explicitAbility) {
    const knownAbilities = buildCommonAbilities(undefined, pokemon.abilities);
    const normalized = normalizeAlias(explicitAbility);

    return (
      knownAbilities.find((ability) => normalizeAlias(ability) === normalized) ??
      explicitAbility
    );
  }

  return inferDefaultAbility(pokemon.id);
}

function getSpriteSources(pokemonId: string) {
  return [
    `https://play.pokemonshowdown.com/sprites/home/${pokemonId}.png`,
    `https://play.pokemonshowdown.com/sprites/dex/${pokemonId}.png`,
    `https://play.pokemonshowdown.com/sprites/gen5/${pokemonId}.png`,
  ];
}

function StatPill({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="theme-subpanel rounded-xl px-2 py-1.5 text-center">
      <div className="theme-text-faint text-[10px] font-semibold uppercase tracking-[0.18em]">
        {label}
      </div>
      <div className="mt-1 font-mono text-sm">{value}</div>
    </div>
  );
}

function PokemonSprite({
  sources,
  name,
}: {
  sources: string[];
  name: string;
}) {
  const [spriteIndex, setSpriteIndex] = useState(0);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sources[spriteIndex]}
        alt={name}
        width={72}
        height={72}
        loading="lazy"
        className="h-[72px] w-[72px] object-contain"
        style={{ imageRendering: "pixelated" }}
        onError={() => {
          setSpriteIndex((current) => (current < sources.length - 1 ? current + 1 : current));
        }}
      />
    </>
  );
}

export function PokemonSideSummary({ side }: { side: SummarySide }) {
  const input = useOmniStore((state) => state.input);

  const summary = useMemo(() => {
    const structure = analyzeCommandStructure(input);
    const attackerBase = resolveParsedSpecies(structure.attacker);
    const attacker = attackerBase
      ? resolveMegaEvolution(attackerBase.id, structure.attacker.itemToken?.value) ?? attackerBase
      : null;
    const defender = resolveParsedSpecies(structure.defender);
    const moveName = resolveMoveName(structure.attacker.moveToken?.value);
    const itemDisplay = structure.attacker.itemToken?.value
      ? itemDisplayById.get(normalizeId(structure.attacker.itemToken.value)) ??
        structure.attacker.itemToken.value
      : null;

    if (side === "attacker") {
      return attacker
        ? {
            title: "Attacker",
            name: attacker.name,
            spriteSources: getSpriteSources(attacker.id),
            ability: resolveAbilityDisplay(attacker, structure.attacker.abilityToken?.value),
            move: moveName,
            item: itemDisplay,
            stats: attacker.baseStats,
          }
        : null;
    }

    return defender
      ? {
          title: "Defender",
          name: defender.name,
          spriteSources: getSpriteSources(defender.id),
          ability: resolveAbilityDisplay(defender, structure.defender.abilityToken?.value),
          move: moveName,
          item: null,
          stats: defender.baseStats,
        }
      : null;
  }, [input, side]);

  if (!summary) {
    return (
      <aside
        data-testid={`${side}-summary`}
        className="theme-panel rounded-[28px] p-4"
      >
        <div className="theme-text-faint text-xs font-semibold uppercase tracking-[0.24em]">
          {side}
        </div>
        <div className="theme-text-dim mt-3 text-sm">
          Resolve the {side} Pokémon to show a quick summary.
        </div>
      </aside>
    );
  }

  return (
    <aside
      data-testid={`${side}-summary`}
      className="theme-panel rounded-[28px] p-4"
    >
      <div className="theme-text-faint text-xs font-semibold uppercase tracking-[0.24em]">
        {summary.title}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="theme-subpanel flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl p-2">
          <PokemonSprite
            key={summary.name}
            sources={summary.spriteSources}
            name={summary.name}
          />
        </div>
        <div className="min-w-0">
          <div className="truncate text-lg font-medium">{summary.name}</div>
          <div className="theme-text-dim mt-1 text-sm">
            Ability: <span className="theme-text-muted">{summary.ability ?? "—"}</span>
          </div>
          {side === "attacker" ? (
            <div className="theme-text-dim mt-1 text-sm">
              Move: <span className="theme-text-muted">{summary.move ?? "—"}</span>
            </div>
          ) : (
            <div className="theme-text-dim mt-1 text-sm">
              Calc: <span className="theme-text-muted">{summary.move ?? "—"}</span>
            </div>
          )}
          {summary.item ? (
            <div className="theme-text-dim mt-1 text-sm">
              Item: <span className="theme-text-muted">{summary.item}</span>
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <StatPill label="HP" value={summary.stats.hp} />
        <StatPill label="Atk" value={summary.stats.atk} />
        <StatPill label="Def" value={summary.stats.def} />
        <StatPill label="SpA" value={summary.stats.spa} />
        <StatPill label="SpD" value={summary.stats.spd} />
        <StatPill label="Spe" value={summary.stats.spe} />
      </div>
    </aside>
  );
}
