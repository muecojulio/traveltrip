/**
 * Search helpers for the combobox: case- and diacritic-insensitive matching,
 * token based so "leon bajio" finds "León · Guanajuato, Del Bajío".
 */

export function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

/** Tokenizes a query; empty query matches everything. */
export function queryTokens(query: string): string[] {
  const normalized = normalizeForSearch(query);
  return normalized ? normalized.split(" ") : [];
}

/** True when every query token appears somewhere in the given fields. */
export function matchesTokens(fields: readonly string[], query: string): boolean {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return true;
  const haystack = normalizeForSearch(fields.join(" "));
  return tokens.every((token) => haystack.includes(token));
}

export function filterByQuery<T>(
  items: readonly T[],
  query: string,
  fields: (item: T) => readonly string[],
): T[] {
  if (queryTokens(query).length === 0) return items.slice();
  return items.filter((item) => matchesTokens(fields(item), query));
}

export type TypeaheadMatch = "exact" | "prefix" | "contains" | null;

/** Rank of a query against one label, used to prefer the closest option. */
export function typeaheadRank(label: string, query: string): TypeaheadMatch {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return null;
  if (!matchesTokens([label], query)) return null;
  const normalized = normalizeForSearch(label);
  const phrase = tokens.join(" ");
  if (normalized === phrase) return "exact";
  if (normalized.startsWith(phrase)) return "prefix";
  const firstWord = normalized.split(" ")[0] ?? "";
  if (firstWord.startsWith(phrase)) return "prefix";
  return "contains";
}

/**
 * First option whose label starts with the typed text — the "type a letter to
 * jump" behaviour of a native select, without stealing the selection.
 */
export function firstPrefixMatch<T>(
  items: readonly T[],
  query: string,
  label: (item: T) => string,
): number {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return -1;
  const startsWith = items.findIndex((item) =>
    normalizeForSearch(label(item)).startsWith(tokens[0]),
  );
  if (startsWith !== -1) return startsWith;
  return items.findIndex((item) => normalizeForSearch(label(item)).includes(tokens[0]));
}
