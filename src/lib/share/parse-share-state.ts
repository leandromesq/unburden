import { normalizeImportedSet } from "@/lib/team/imported-set-utils";
import type { ImportedSet, ShareState } from "@/lib/types";

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf-8");
  }

  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function isImportedSetLike(value: unknown): value is ImportedSet {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.speciesId === "string" &&
    typeof candidate.speciesName === "string"
  );
}

export function parseShareState(encoded: string | null) {
  if (!encoded) {
    return [];
  }

  try {
    const decoded = decodeBase64Url(encoded);
    const parsed = JSON.parse(decoded) as ShareState;

    if (parsed.v !== 1 || !Array.isArray(parsed.sets)) {
      return [];
    }

    return parsed.sets
      .filter(isImportedSetLike)
      .map((set) => normalizeImportedSet(set));
  } catch {
    return [];
  }
}
