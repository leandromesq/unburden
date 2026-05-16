const TYPE_COLOR_TOKENS: Record<string, string> = {
  normal: "--type-normal",
  fire: "--type-fire",
  water: "--type-water",
  electric: "--type-electric",
  grass: "--type-grass",
  ice: "--type-ice",
  fighting: "--type-fighting",
  poison: "--type-poison",
  ground: "--type-ground",
  flying: "--type-flying",
  psychic: "--type-psychic",
  bug: "--type-bug",
  rock: "--type-rock",
  ghost: "--type-ghost",
  dragon: "--type-dragon",
  dark: "--type-dark",
  steel: "--type-steel",
  fairy: "--type-fairy",
};

export function getPokemonTypeColor(type: string | null | undefined) {
  if (!type) {
    return "var(--surface-3)";
  }

  const token = TYPE_COLOR_TOKENS[type.toLowerCase()] ?? "--type-fallback";
  return `var(${token})`;
}
