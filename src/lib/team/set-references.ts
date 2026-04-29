import { normalizeId } from "@/lib/data/normalization";
import type { ImportedSet } from "@/lib/types";

function normalizeReferenceValue(value: string) {
  return normalizeId(value.replace(/^#/, ""));
}

function getImportedSetReferenceAliases(set: ImportedSet) {
  const aliases = new Set<string>();

  aliases.add(normalizeReferenceValue(set.speciesId));
  aliases.add(normalizeReferenceValue(set.speciesName));

  if (set.nickname) {
    aliases.add(normalizeReferenceValue(set.nickname));
  }

  return Array.from(aliases);
}

export function getCanonicalSetReferenceToken(set: ImportedSet) {
  const preferred = set.nickname ? normalizeReferenceValue(set.nickname) : normalizeReferenceValue(set.speciesId);
  return `#${preferred}`;
}

export function resolveSetReferenceToken(
  rawToken: string | undefined,
  importedSets: Record<string, ImportedSet>,
) {
  if (!rawToken?.startsWith("#")) {
    return null;
  }

  const query = normalizeReferenceValue(rawToken);

  return (
    Object.values(importedSets).find((set) =>
      getImportedSetReferenceAliases(set).includes(query),
    ) ?? null
  );
}

export function resolveReferencedImportedSet(
  referenceId: string | undefined,
  importedSets: Record<string, ImportedSet>,
) {
  if (!referenceId) {
    return null;
  }

  return importedSets[normalizeId(referenceId)] ?? null;
}

export function searchSetReferences(
  query: string,
  importedSets: Record<string, ImportedSet>,
  limit = 6,
) {
  const normalizedQuery = normalizeReferenceValue(query);

  return Object.values(importedSets)
    .map((set) => {
      const aliases = getImportedSetReferenceAliases(set);
      const canonicalToken = getCanonicalSetReferenceToken(set);
      const hasPrefixMatch =
        !normalizedQuery ||
        aliases.some((alias) => alias.startsWith(normalizedQuery));
      const hasLooseMatch =
        !normalizedQuery ||
        aliases.some((alias) => alias.includes(normalizedQuery));

      if (!hasPrefixMatch && !hasLooseMatch) {
        return null;
      }

      return {
        set,
        aliases,
        canonicalToken,
        prefixRank: hasPrefixMatch ? 0 : 1,
      };
    })
    .filter(
      (
        entry,
      ): entry is {
        set: ImportedSet;
        aliases: string[];
        canonicalToken: string;
        prefixRank: number;
      } => Boolean(entry),
    )
    .sort((left, right) => {
      if (left.prefixRank !== right.prefixRank) {
        return left.prefixRank - right.prefixRank;
      }

      return left.set.speciesName.localeCompare(right.set.speciesName);
    })
    .slice(0, limit);
}
