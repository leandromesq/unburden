import type { ImportedSet, ShareState, SpeedBenchmarkShareState } from "@/lib/types";

function encodeBase64Url(value: string) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf-8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  const bytes = new TextEncoder().encode(value);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function serializeShareState(sets: ImportedSet[]) {
  if (!sets.length) {
    return null;
  }

  const payload: ShareState = {
    v: 1,
    sets,
  };

  return encodeBase64Url(JSON.stringify(payload));
}

export function serializeSpeedShareState(state: SpeedBenchmarkShareState) {
  const payload: ShareState = {
    v: 2,
    page: "speed",
    state,
  };

  return encodeBase64Url(JSON.stringify(payload));
}
