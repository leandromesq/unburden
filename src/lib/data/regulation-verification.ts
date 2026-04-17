function normalizeAlias(value: string) {
  return value
    .toLowerCase()
    .replace(/['.:]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compactAlias(value: string) {
  return normalizeAlias(value).replace(/\s+/g, "");
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;|&rsquo;/g, "'")
    .replace(/&eacute;/g, "é")
    .replace(/&nbsp;/g, " ")
    .trim();
}

const ROSTER_SECTION_PATTERN =
  /<h2[^>]*>\s*Newly Useable Pok(?:&eacute;|é)mon\s*<\/h2><\/p>([\s\S]*?)(?=<p><h2|$)/i;
const ROSTER_NAME_PATTERN = /<a href="\/pokedex-champions\/[^"]+\/">([\s\S]*?)<\/a>/gi;

export function parseSerebiiRegulationRosterNames(html: string) {
  const rosterSection = html.match(ROSTER_SECTION_PATTERN)?.[1];

  if (!rosterSection) {
    throw new Error(
      "Failed to locate the Serebii regulation roster section in the page.",
    );
  }

  const names = new Set<string>();

  for (const match of rosterSection.matchAll(ROSTER_NAME_PATTERN)) {
    const [rawLabel] = (match[1] ?? "").split(/<br\s*\/?>/i);
    const name = decodeHtmlEntities(
      rawLabel.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    );

    if (!name) {
      continue;
    }

    names.add(name);
  }

  if (names.size === 0) {
    throw new Error("Failed to parse any Pokemon names from the Serebii roster.");
  }

  return Array.from(names);
}

export function resolveRegulationRosterIds(
  speciesNames: string[],
  speciesIdIndex: Map<string, string>,
) {
  const resolvedIds = new Set<string>();
  const unresolvedSpeciesNames: string[] = [];

  for (const speciesName of speciesNames) {
    const speciesId = speciesIdIndex.get(compactAlias(speciesName));

    if (!speciesId) {
      unresolvedSpeciesNames.push(speciesName);
      continue;
    }

    resolvedIds.add(speciesId);
  }

  return {
    liveRosterIds: Array.from(resolvedIds).sort(),
    unresolvedSpeciesNames,
  };
}

export function compareRegulationRosters(
  liveRosterIds: Iterable<string>,
  localRosterIds: Iterable<string>,
) {
  const liveRoster = new Set(liveRosterIds);
  const localRoster = new Set(localRosterIds);

  return {
    missingFromLocal: Array.from(liveRoster)
      .filter((pokemonId) => !localRoster.has(pokemonId))
      .sort(),
    extraInLocal: Array.from(localRoster)
      .filter((pokemonId) => !liveRoster.has(pokemonId))
      .sort(),
  };
}

export async function buildRosterHash(pokemonIds: Iterable<string>) {
  const { createHash } = await import("node:crypto");
  const normalizedRoster = Array.from(new Set(pokemonIds)).sort();

  return `sha256:${createHash("sha256")
    .update(JSON.stringify(normalizedRoster))
    .digest("hex")}`;
}

export function formatVerificationDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

const regulationVerification = {
  buildRosterHash,
  compareRegulationRosters,
  formatVerificationDate,
  parseSerebiiRegulationRosterNames,
  resolveRegulationRosterIds,
};

export default regulationVerification;
