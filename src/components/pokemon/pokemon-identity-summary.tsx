"use client";

import type { CSSProperties, ReactNode } from "react";

import { MoveTypeIcon } from "@/components/omnibar/move-type-icon";
import { PokemonSprite } from "@/components/omnibar/pokemon-summary/pokemon-sprite";
import { normalizeAlias } from "@/lib/data/normalization";
import type { PokemonEntry } from "@/lib/types";
import { getPokemonTypeColor } from "@/lib/ui/type-colors";

function formatTypeName(type: string) {
  return type.slice(0, 1).toUpperCase() + type.slice(1).toLowerCase();
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

interface PokemonIdentitySummaryProps {
  pokemon: PokemonEntry;
  resolvedPokemon?: PokemonEntry;
  eyebrow?: string;
  trailing?: ReactNode;
  meta?: ReactNode;
  showOrigin?: boolean;
}

export function PokemonIdentitySummary({
  pokemon,
  resolvedPokemon = pokemon,
  eyebrow,
  trailing,
  meta,
  showOrigin = true,
}: PokemonIdentitySummaryProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:items-start">
      <div className="theme-summary-sprite-shell flex size-16 items-center justify-center rounded-lg p-2">
        <PokemonSprite
          sources={getPokemonSpriteSources(resolvedPokemon)}
          name={resolvedPokemon.name}
          primaryType={resolvedPokemon.types[0] ?? null}
        />
      </div>

      <div className="min-w-0">
        {eyebrow ? (
          <div className="theme-text-faint text-[0.72rem] font-medium uppercase tracking-normal">
            {eyebrow}
          </div>
        ) : null}
        <div className="truncate text-lg font-semibold">
          {resolvedPokemon.name}
        </div>
        {showOrigin && resolvedPokemon.id !== pokemon.id ? (
          <div className="theme-text-faint mt-0.5 text-xs">
            From {pokemon.name}
          </div>
        ) : null}

        <div className="mt-2 flex flex-wrap gap-1.5">
          {resolvedPokemon.types.map((type) => (
            <span
              key={type}
              className="theme-type-badge inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-medium"
              style={{ "--type-color": getPokemonTypeColor(type) } as CSSProperties}
            >
              <MoveTypeIcon type={type} size={12} />
              <span>{formatTypeName(type)}</span>
            </span>
          ))}
        </div>

        {meta ? <div className="mt-2">{meta}</div> : null}
      </div>

      {trailing ? <div className="sm:justify-self-end">{trailing}</div> : null}
    </div>
  );
}
