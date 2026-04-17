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

const PIKALYTICS_AI_BASE_URL = "https://www.pikalytics.com/ai/pokedex";
const PIKALYTICS_WEB_BASE_URL = "https://www.pikalytics.com/pokedex";

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

export function parseFormatDataDate(markdown: string) {
  const match = markdown.match(/- \*\*Data Date\*\*: ([\d-]+)/);
  return match?.[1] ?? null;
}

export function parseCurrentFormatCode(pageContent: string) {
  const markdownMatch = pageContent.match(/- \*\*Format Code\*\*: `([^`]+)`/);

  if (markdownMatch?.[1]) {
    return markdownMatch[1];
  }

  const aiUrlMatch = pageContent.match(
    /"contentUrl":"https:\/\/www\.pikalytics\.com\/ai\/pokedex\/([^/"\\]+)\//,
  );

  if (aiUrlMatch?.[1]) {
    return aiUrlMatch[1];
  }

  const canonicalMatch = pageContent.match(
    /<link rel="canonical" href="https:\/\/www\.pikalytics\.com\/pokedex\/([^/"?#]+)/,
  );

  if (canonicalMatch?.[1]) {
    return canonicalMatch[1];
  }

  return null;
}

export async function fetchPikalyticsHomePage() {
  return fetchText(`${PIKALYTICS_WEB_BASE_URL}/`);
}

export async function fetchPikalyticsFormatIndex(formatCode: string) {
  return fetchText(`${PIKALYTICS_AI_BASE_URL}/${formatCode}`);
}

export async function resolvePikalyticsAiMarkdown(
  formatCode: string,
  candidateSpeciesNames: string[],
) {
  const candidates = dedupeStrings(candidateSpeciesNames);

  for (const speciesName of candidates) {
    const speciesSlug = compactAlias(speciesName);

    if (!speciesSlug) {
      continue;
    }

    const markdownUrl = `${PIKALYTICS_AI_BASE_URL}/${formatCode}/${speciesSlug}`;

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

  return {
    speciesName: null,
    markdown: null,
    error: `No Pikalytics AI page resolved from candidates ${candidates.join(", ")}`,
  };
}
