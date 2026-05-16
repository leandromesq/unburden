"use client";

import { useMemo, useState } from "react";

import { getPokemonTypeColor } from "@/lib/ui/type-colors";

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
      className="flex h-18 w-18 items-center justify-center rounded-xl font-mono text-lg font-bold tracking-[0.08em] text-[var(--text)]"
      style={{
        background: getPokemonTypeColor(primaryType),
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
  loading?: "eager" | "lazy";
}

export function PokemonSprite({
  sources,
  name,
  primaryType,
  loading = "eager",
}: PokemonSpriteProps) {
  const sourceKey = useMemo(() => sources.join("\n"), [sources]);
  const [failedState, setFailedState] = useState<{
    sourceKey: string;
    sources: string[];
  }>({ sourceKey, sources: [] });
  const failedSources = failedState.sourceKey === sourceKey ? failedState.sources : [];
  const activeSource = sources.find((source) => !failedSources.includes(source));

  if (!activeSource) {
    return <PokemonSpriteFallback name={name} primaryType={primaryType} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={activeSource}
      alt={name}
      width={72}
      height={72}
      loading={loading}
      className="h-18 w-18 object-contain"
      style={{ imageRendering: "pixelated" }}
      onError={(event) => {
        const nextFailedSource = event.currentTarget.currentSrc || activeSource;
        setFailedState((current) => {
          const currentSources = current.sourceKey === sourceKey ? current.sources : [];

          return currentSources.includes(nextFailedSource)
            ? { sourceKey, sources: currentSources }
            : { sourceKey, sources: [...currentSources, nextFailedSource] };
        });
      }}
    />
  );
}
