export type UsageEntry = {
  name: string;
  usage: number;
};

export type PikalyticsIndexEntry = {
  speciesName: string;
  usagePercent: number;
  aiUrl: string;
  webUrl: string;
};

type PikalyticsFormatMetadata = {
  formatName: string;
  formatCode: string;
  game: string | null;
  dataDate: string | null;
  standardUiUrl: string | null;
};

const PIKALYTICS_AI_BASE_URL = "https://www.pikalytics.com/ai/pokedex";

function dedupeStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: "text/markdown, text/plain;q=0.9, */*;q=0.1",
      "User-Agent": "omniboost-pikalytics-fetcher/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
    );
  }

  return response.text();
}

function extractSpeciesNameFromAiUrl(aiUrl: string) {
  const match = aiUrl.match(/\/ai\/pokedex\/[^/]+\/([^/?#]+)/);

  if (!match?.[1]) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function buildAiSpeciesPathCandidates(speciesName: string) {
  const normalized = speciesName.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return [];
  }

  return dedupeStrings([
    normalized,
    normalized.replace(/\s*-\s*/g, "-"),
    normalized.includes("-") ? normalized.replace(/-/g, " ") : null,
    normalized.includes(" ") ? normalized.replace(/\s+/g, "-") : null,
  ]);
}

function buildPikalyticsAiUrl(formatCode: string, speciesName: string) {
  return `${PIKALYTICS_AI_BASE_URL}/${encodeURIComponent(formatCode)}/${encodeURIComponent(speciesName)}`;
}

export function parseIndexSpeciesNames(markdown: string) {
  const names: string[] = [];
  const matcher =
    /^\|\s*\d+\s*\|\s*\*\*(.+?)\*\*\s*\|\s*[\d.]+%\s*\|\s*\[View\]\(.+?\)\s*\|\s*\[AI\]\(.+?\)\s*\|$/gm;

  for (const match of markdown.matchAll(matcher)) {
    names.push(match[1].trim());
  }

  return names;
}

export function extractMarkdownSection(markdown: string, heading: string) {
  const match = markdown.match(
    new RegExp(
      `## ${escapeRegex(heading)}\\r?\\n([\\s\\S]*?)(?=\\r?\\n## |\\r?\\n---|$)`,
    ),
  );

  return match?.[1]?.trim() ?? "";
}

export function parseUsageEntries(sectionMarkdown: string) {
  const entries: UsageEntry[] = [];
  const matcher = /^- \*\*(.+?)\*\*: ([\d.]+)%$/gm;

  for (const match of sectionMarkdown.matchAll(matcher)) {
    entries.push({
      name: match[1].trim(),
      usage: Number(match[2]),
    });
  }

  return entries;
}

export function parseIndexEntries(markdown: string) {
  const entries: PikalyticsIndexEntry[] = [];
  const matcher =
    /^\|\s*\d+\s*\|\s*\*\*(.+?)\*\*\s*\|\s*([\d.]+)%\s*\|\s*\[View\]\((.+?)\)\s*\|\s*\[AI\]\((.+?)\)\s*\|$/gm;

  for (const match of markdown.matchAll(matcher)) {
    entries.push({
      speciesName: match[1].trim(),
      usagePercent: Number(match[2]),
      webUrl: match[3],
      aiUrl: match[4],
    });
  }

  return entries;
}

export function parseFormatMetadata(markdown: string) {
  const formatName =
    markdown.match(/- \*\*Format\*\*: (.+)/)?.[1]?.trim() ?? null;
  const formatCode = markdown.match(/- \*\*Format Code\*\*: `([^`]+)`/)?.[1];
  const game = markdown.match(/- \*\*Game\*\*: (.+)/)?.[1]?.trim() ?? null;
  const dataDate = markdown.match(/- \*\*Data Date\*\*: ([\d-]+)/)?.[1] ?? null;
  const standardUiUrl =
    markdown.match(/- \*\*Standard UI\*\*: \[.+?\]\((.+?)\)/)?.[1] ?? null;

  if (!formatName || !formatCode) {
    return null;
  }

  return {
    formatName,
    formatCode,
    game,
    dataDate,
    standardUiUrl,
  } satisfies PikalyticsFormatMetadata;
}

export function parseFormatDataDate(markdown: string) {
  return parseFormatMetadata(markdown)?.dataDate ?? null;
}

export async function fetchPikalyticsFormatIndex(formatCode?: string) {
  return fetchText(
    formatCode
      ? `${PIKALYTICS_AI_BASE_URL}/${encodeURIComponent(formatCode)}`
      : PIKALYTICS_AI_BASE_URL,
  );
}

export async function resolvePikalyticsAiMarkdown(
  formatCode: string,
  candidateSpeciesNames: string[],
  preferredAiUrl?: string | null,
) {
  const candidates = dedupeStrings(candidateSpeciesNames);
  const attemptedUrls = new Set<string>();

  const preferredUrls = dedupeStrings([preferredAiUrl]);

  for (const aiUrl of preferredUrls) {
    attemptedUrls.add(aiUrl);

    try {
      const markdown = await fetchText(aiUrl);

      if (!markdown.trim()) {
        continue;
      }

      return {
        speciesName: extractSpeciesNameFromAiUrl(aiUrl),
        markdown,
        error: null,
      };
    } catch {
      continue;
    }
  }

  for (const speciesName of candidates) {
    for (const speciesPath of buildAiSpeciesPathCandidates(speciesName)) {
      const markdownUrl = buildPikalyticsAiUrl(formatCode, speciesPath);

      if (attemptedUrls.has(markdownUrl)) {
        continue;
      }

      attemptedUrls.add(markdownUrl);

      try {
        const markdown = await fetchText(markdownUrl);

        if (!markdown.trim()) {
          continue;
        }

        return {
          speciesName,
          markdown,
          error: null,
        };
      } catch {
        continue;
      }
    }
  }

  return {
    speciesName: null,
    markdown: null,
    error: `No Pikalytics AI page resolved from candidates ${candidates.join(", ")}`,
  };
}
