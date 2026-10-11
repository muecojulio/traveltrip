import test from "node:test";
import assert from "node:assert/strict";
import {
  filterByQuery,
  firstPrefixMatch,
  matchesTokens,
  normalizeForSearch,
  queryTokens,
  typeaheadRank,
} from "./search-filter.ts";

const origins = [
  { iata: "MEX", city: "Ciudad de México", airport: "AICM" },
  { iata: "NLU", city: "Ciudad de México", airport: "AIFA" },
  { iata: "BJX", city: "León / Guanajuato", airport: "Del Bajío" },
  { iata: "CUN", city: "Cancún", airport: "Cancún" },
];

const label = (item: (typeof origins)[number]) => `${item.city} · ${item.airport} · ${item.iata}`;

test("normalization drops accents and case", () => {
  assert.equal(normalizeForSearch("  León   / Guanajuato "), "leon / guanajuato");
  assert.equal(normalizeForSearch("Cancún"), "cancun");
  assert.equal(normalizeForSearch("MÉXICO"), "mexico");
});

test("diacritics and case never decide whether an option is found", () => {
  assert.equal(matchesTokens(["León / Guanajuato"], "leon"), true);
  assert.equal(matchesTokens(["León / Guanajuato"], "LEÓN"), true);
  assert.equal(matchesTokens(["León / Guanajuato"], "Guanajuato"), true);
  assert.equal(matchesTokens(["Cancún"], "cancun"), true);
  assert.equal(matchesTokens(["Cancún"], "tijuana"), false);
});

test("multi-token queries match in any order across all fields", () => {
  const results = filterByQuery(origins, "bajio leon", (item) => [label(item)]);
  assert.deepEqual(
    results.map((item) => item.iata),
    ["BJX"],
  );
  const byCode = filterByQuery(origins, "nlu", (item) => [label(item)]);
  assert.deepEqual(
    byCode.map((item) => item.iata),
    ["NLU"],
  );
  // Searching by airport name finds both Mexico City airports.
  const cityHalls = filterByQuery(origins, "ciudad", (item) => [label(item)]);
  assert.deepEqual(
    cityHalls.map((item) => item.iata),
    ["MEX", "NLU"],
  );
});

test("an empty query keeps every option and never returns the input array", () => {
  const all = filterByQuery(origins, "   ", (item) => [label(item)]);
  assert.equal(all.length, origins.length);
  assert.notEqual(all, origins);
  assert.deepEqual(queryTokens(""), []);
});

test("typeahead ranks exact, then prefix, and reports no match honestly", () => {
  assert.equal(typeaheadRank("Cancún", "cancun"), "exact");
  assert.equal(typeaheadRank("Cancún · Cancún · CUN", "can"), "prefix");
  assert.equal(typeaheadRank("Ciudad de México · AICM · MEX", "mexico"), "contains");
  assert.equal(typeaheadRank("Cancún", "tijuana"), null);
  assert.equal(typeaheadRank("Cancún", "  "), null);
});

test("typing a letter jumps to the first option that starts with it", () => {
  assert.equal(firstPrefixMatch(origins, "l", label), 2);
  assert.equal(firstPrefixMatch(origins, "c", label), 0);
  assert.equal(firstPrefixMatch(origins, "bajio", label), 2);
  assert.equal(firstPrefixMatch(origins, "zzz", label), -1);
  assert.equal(firstPrefixMatch(origins, "", label), -1);
});
