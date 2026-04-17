"use client";

import { useState } from "react";

const TYPE_COLORS: Record<string, string> = {
  bug: "#8aa11a",
  dark: "#5a5366",
  dragon: "#0f6ac0",
  electric: "#f2c94c",
  fairy: "#ef90e6",
  fighting: "#ce416b",
  fire: "#ff7f50",
  flying: "#89aae3",
  ghost: "#5269ad",
  grass: "#63bc5a",
  ground: "#d97845",
  ice: "#73cec0",
  normal: "#919aa2",
  poison: "#b567ce",
  psychic: "#fa7179",
  rock: "#c5b78c",
  steel: "#5a8ea2",
  water: "#539ddf",
};

function getFallbackInitials(name: string) {
  const words = name
    .split(/[^A-Za-z0-9]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  const compact = name.replace(/[^A-Za-z0-9]+/g, "");
  return compact.slice(0, 2).toUpperCase() || "PK";
}

function PokemonSpriteFallback({
  name,
  primaryType,
}: {
  name: string;
  primaryType: string | null;
}) {
  return (
    <div
      role="img"
      aria-label={`${name} sprite fallback`}
      className="flex h-18 w-18 items-center justify-center rounded-xl font-mono text-lg font-bold tracking-[0.08em] text-white"
      style={{
        background:
          TYPE_COLORS[primaryType?.toLowerCase() ?? ""] ?? "var(--surface-3)",
      }}
    >
      {getFallbackInitials(name)}
    </div>
  );
}

interface PokemonSpriteProps {
  sources: string[];
  name: string;
  primaryType: string | null;
}

export function PokemonSprite({
  sources,
  name,
  primaryType,
}: PokemonSpriteProps) {
  const [spriteIndex, setSpriteIndex] = useState(0);

  if (sources.length === 0 || spriteIndex >= sources.length) {
    return <PokemonSpriteFallback name={name} primaryType={primaryType} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sources[spriteIndex]}
      alt={name}
      width={72}
      height={72}
      loading="lazy"
      className="h-18 w-18 object-contain"
      style={{ imageRendering: "pixelated" }}
      onError={() => {
        setSpriteIndex((current) => current + 1);
      }}
    />
  );
}

