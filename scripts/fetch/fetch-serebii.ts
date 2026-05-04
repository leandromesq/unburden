const SEREBII_CHAMPIONS_MEGA_ABILITIES_URL =
  "https://www.serebii.net/pokemonchampions/megaabilities.shtml";
const SEREBII_CHAMPIONS_ITEMS_URL =
  "https://www.serebii.net/pokemonchampions/items.shtml";

type ItemEntry = {
  id: string;
  name: string;
};

function normalizeAlias(value: string) {
  return value
    .toLowerCase()
    .replace(/['.:]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;|&rsquo;/g, "'")
    .replace(/&eacute;/g, "é")
    .replace(/&nbsp;/g, " ")
    .trim();
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/markdown, text/plain;q=0.9, */*;q=0.1",
      "User-Agent": "unburden-serebii-fetcher/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
    );
  }

  return response.text();
}

function parseChampionsMegaAbilities(markdownOrHtml: string) {
  const megaAbilities = new Map<string, string>();
  const matcher =
    /<a href="\/pokedex-champions\/[^"]+\/">(Mega [^<]+)<\/a>[\s\S]*?<a href="\/abilitydex\/[^"]+\.shtml">([^<]+)<\/a>/g;

  for (const match of markdownOrHtml.matchAll(matcher)) {
    megaAbilities.set(match[1].trim(), match[2].trim());
  }

  return megaAbilities;
}

function parseChampionsItems(html: string) {
  const legalSection =
    html.split(/<u>\s*Miscellaneous Items\s*<\/u>/i)[0] ?? html;
  const items = new Map<string, string>();
  const matcher =
    /<td class="fooinfo"><a href="\/itemdex\/([a-z0-9-]+)\.shtml">([^<]+)<\/a><\/td>/gi;

  for (const match of legalSection.matchAll(matcher)) {
    const name = decodeHtmlEntities(match[2] ?? "");
    if (!name) {
      continue;
    }

    items.set(normalizeAlias(name).replace(/\s+/g, ""), name);
  }

  if (items.size === 0) {
    throw new Error("Failed to parse Champions legal items from Serebii.");
  }

  return Array.from(items.entries())
    .map(([id, name]) => ({ id, name }) satisfies ItemEntry)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function fetchChampionsMegaAbilities() {
  const html = await fetchText(SEREBII_CHAMPIONS_MEGA_ABILITIES_URL);
  return parseChampionsMegaAbilities(html);
}

export async function fetchChampionsItems() {
  const html = await fetchText(SEREBII_CHAMPIONS_ITEMS_URL);
  return parseChampionsItems(html);
}

