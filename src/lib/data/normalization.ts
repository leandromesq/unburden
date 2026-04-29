export function normalizeId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function normalizeAlias(value: string) {
  return value
    .toLowerCase()
    .replace(/['.:]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
