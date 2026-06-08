export type UsageEntry = {
  name: string;
  usage: number;
};

export type SmogonChaosPokemonStats = {
  "Raw count"?: number;
  usage: number;
  "Viability Ceiling"?: [number, number, number, number];
  Abilities?: Record<string, number>;
  Items?: Record<string, number>;
  "Tera Types"?: Record<string, number>;
  Spreads?: Record<string, number>;
  Happiness?: Record<string, number>;
  Moves?: Record<string, number>;
  Teammates?: Record<string, number>;
  "Checks and Counters"?: Record<string, [number, number, number]>;
};

export type SmogonChaosStats = {
  info: {
    metagame: string;
    cutoff: number;
    "cutoff deviation"?: number;
    "team type"?: string | null;
    "number of battles": number;
  };
  data: Record<string, SmogonChaosPokemonStats>;
};

export type SmogonMetaRecord = {
  speciesName: string;
  usagePercent: number;
  moves: UsageEntry[];
  abilities: UsageEntry[];
  items: UsageEntry[];
};

export type SmogonStatsFetchResult = {
  formatId: string;
  month: string;
  cutoff: number;
  stats: SmogonChaosStats;
};

export const DEFAULT_SMOGON_STATS_FORMAT = "championsvgc2026regma";
export const DEFAULT_SMOGON_STATS_CUTOFF = 1500;

const SMOGON_STATS_BASE_URL = "https://www.smogon.com/stats";
const LATEST_MONTH = "latest";

async function fetchText(url: string, accept: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: accept,
      "User-Agent": "unburden-smogon-stats-fetcher/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
    );
  }

  return response.text();
}

async function fetchJson<T>(url: string): Promise<T> {
  const text = await fetchText(url, "application/json, */*;q=0.1");
  return JSON.parse(text) as T;
}

export function resolveSmogonStatsFormatId(format: string) {
  const normalized = format.trim().toLowerCase();

  if (!normalized) {
    throw new Error("Smogon stats format cannot be empty.");
  }

  return /^gen\d/.test(normalized) ? normalized : `gen9${normalized}`;
}

export function buildSmogonChaosStatsUrl({
  month,
  format,
  cutoff,
}: {
  month: string;
  format: string;
  cutoff: number;
}) {
  if (!Number.isInteger(cutoff) || cutoff < 0) {
    throw new Error(
      `Smogon stats cutoff must be a non-negative integer: ${cutoff}.`,
    );
  }

  const formatId = resolveSmogonStatsFormatId(format);
  return `${SMOGON_STATS_BASE_URL}/${encodeURIComponent(month)}/chaos/${encodeURIComponent(formatId)}-${cutoff}.json`;
}

export function parseSmogonStatsMonths(indexHtml: string) {
  const months = new Set<string>();
  const matcher = /href="(\d{4}-\d{2})\/"/g;

  for (const match of indexHtml.matchAll(matcher)) {
    months.add(match[1]);
  }

  return Array.from(months).sort((left, right) => right.localeCompare(left));
}

export function smogonStatsDirectoryIncludesFormat({
  directoryHtml,
  format,
  cutoff,
}: {
  directoryHtml: string;
  format: string;
  cutoff: number;
}) {
  const formatId = resolveSmogonStatsFormatId(format);
  const filename = `${formatId}-${cutoff}.json`;
  return directoryHtml.includes(`href="${filename}"`);
}

export async function resolveLatestSmogonStatsMonth({
  format,
  cutoff,
}: {
  format: string;
  cutoff: number;
}) {
  const indexHtml = await fetchText(
    `${SMOGON_STATS_BASE_URL}/`,
    "text/html, text/plain;q=0.9, */*;q=0.1",
  );
  const months = parseSmogonStatsMonths(indexHtml);

  for (const month of months) {
    try {
      const directoryHtml = await fetchText(
        `${SMOGON_STATS_BASE_URL}/${month}/chaos/`,
        "text/html, text/plain;q=0.9, */*;q=0.1",
      );

      if (
        smogonStatsDirectoryIncludesFormat({ directoryHtml, format, cutoff })
      ) {
        return month;
      }
    } catch {
      continue;
    }
  }

  throw new Error(
    `No Smogon chaos stats found for ${resolveSmogonStatsFormatId(format)}-${cutoff}.json.`,
  );
}

function validateSmogonChaosStats(stats: SmogonChaosStats) {
  if (!stats.info?.metagame) {
    throw new Error("Smogon chaos stats response is missing info.metagame.");
  }

  if (!Number.isFinite(stats.info.cutoff)) {
    throw new Error("Smogon chaos stats response is missing info.cutoff.");
  }

  if (!stats.data || typeof stats.data !== "object") {
    throw new Error("Smogon chaos stats response is missing data.");
  }
}

export async function fetchSmogonChaosStats({
  format = DEFAULT_SMOGON_STATS_FORMAT,
  month = LATEST_MONTH,
  cutoff = DEFAULT_SMOGON_STATS_CUTOFF,
}: {
  format?: string;
  month?: string;
  cutoff?: number;
} = {}): Promise<SmogonStatsFetchResult> {
  const formatId = resolveSmogonStatsFormatId(format);
  const resolvedMonth =
    !month || month === LATEST_MONTH
      ? await resolveLatestSmogonStatsMonth({ format: formatId, cutoff })
      : month;
  const stats = await fetchJson<SmogonChaosStats>(
    buildSmogonChaosStatsUrl({
      month: resolvedMonth,
      format: formatId,
      cutoff,
    }),
  );

  validateSmogonChaosStats(stats);

  if (stats.info.metagame !== formatId) {
    throw new Error(
      `Fetched Smogon stats for ${stats.info.metagame}; expected ${formatId}.`,
    );
  }

  if (stats.info.cutoff !== cutoff) {
    throw new Error(
      `Fetched Smogon stats cutoff ${stats.info.cutoff}; expected ${cutoff}.`,
    );
  }

  return {
    formatId,
    month: resolvedMonth,
    cutoff,
    stats,
  };
}

export function usageMapToEntries(
  usageMap: Record<string, number> | undefined,
) {
  return Object.entries(usageMap ?? {})
    .map(([name, usage]) => ({ name: name.trim(), usage }))
    .filter(
      (entry) => entry.name && Number.isFinite(entry.usage) && entry.usage > 0,
    )
    .sort((left, right) => {
      if (right.usage !== left.usage) {
        return right.usage - left.usage;
      }

      return left.name.localeCompare(right.name);
    });
}

export function parseSmogonMetaRecords(stats: SmogonChaosStats) {
  return Object.entries(stats.data)
    .map(([speciesName, pokemonStats]) => ({
      speciesName,
      usagePercent: pokemonStats.usage * 100,
      abilities: usageMapToEntries(pokemonStats.Abilities),
      items: usageMapToEntries(pokemonStats.Items),
      moves: usageMapToEntries(pokemonStats.Moves),
    }))
    .filter(
      (entry) =>
        entry.speciesName.trim() && Number.isFinite(entry.usagePercent),
    )
    .sort((left, right) => {
      if (right.usagePercent !== left.usagePercent) {
        return right.usagePercent - left.usagePercent;
      }

      return left.speciesName.localeCompare(right.speciesName);
    });
}

export function parseSmogonSpeciesNames(stats: SmogonChaosStats) {
  return Object.keys(stats.data).filter((speciesName) => speciesName.trim());
}

export async function fetchSmogonMetaRecords(options?: {
  format?: string;
  month?: string;
  cutoff?: number;
}) {
  const result = await fetchSmogonChaosStats(options);

  return {
    ...result,
    records: parseSmogonMetaRecords(result.stats),
  };
}
