import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { dedupeInFlight, MemoryLruCache } from "./cache.ts";

test("MemoryLruCache enforces TTL expiration and evicts least-recently-used entries", () => {
  const cache = new MemoryLruCache<string>(2);
  cache.set("a", "uno", 1000, 100);
  cache.set("b", "dos", 1000, 100);
  assert.equal(cache.size, 2);

  // Touch "a" so "b" becomes the oldest
  assert.equal(cache.get("a", 200), "uno");
  cache.set("c", "tres", 1000, 200);
  assert.equal(cache.get("b", 200), null);
  assert.equal(cache.get("a", 200), "uno");
  assert.equal(cache.get("c", 200), "tres");

  // Expire "a"
  assert.equal(cache.get("a", 1200), null);
});

test("dedupeInFlight shares a single in-flight promise for concurrent identical keys", async () => {
  let calls = 0;
  const task = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 15));
    return "shared-result";
  };

  const [r1, r2, r3] = await Promise.all([
    dedupeInFlight("same-key", task),
    dedupeInFlight("same-key", task),
    dedupeInFlight("same-key", task),
  ]);

  assert.equal(calls, 1);
  assert.equal(r1, "shared-result");
  assert.equal(r2, "shared-result");
  assert.equal(r3, "shared-result");
});

test("database migrations 0002 and 0003 create quote_cache, service_cache, and all performance indexes", async () => {
  const pg = new PGlite();
  await pg.waitReady;
  try {
    const sql0002 = readFileSync(new URL("../../../migrations/0002_quote_cache.sql", import.meta.url), "utf8");
    const sql0003 = readFileSync(
      new URL("../../../migrations/0003_cache_and_indexes.sql", import.meta.url),
      "utf8",
    );
    await pg.exec(sql0002);
    await pg.exec(sql0003);

    const indexResult = await pg.query<{ indexname: string }>(`
      select indexname
      from pg_indexes
      where schemaname = 'public'
        and tablename in ('quote_cache', 'service_cache')
    `);
    const indexNames = new Set(indexResult.rows.map((r) => r.indexname));

    assert.ok(indexNames.has("quote_cache_fetched_at_idx"));
    assert.ok(indexNames.has("quote_cache_expires_at_idx"));
    assert.ok(indexNames.has("quote_cache_dest_origin_fetched_idx"));
    assert.ok(indexNames.has("quote_cache_dest_best_price_idx"));
    assert.ok(indexNames.has("service_cache_expires_at_idx"));
    assert.ok(indexNames.has("service_cache_category_fetched_idx"));

    // Verify insert and indexed lookup on quote_cache & service_cache
    await pg.query(
      `insert into quote_cache (cache_key, payload, destination_id, origin_iata, check_in, best_total_mxn)
       values ($1, $2, $3, $4, $5, $6)`,
      ["v4|cancun|CUN|MEX", '{"place":"Cancún"}', "cancun", "MEX", "2026-11-10", 8450],
    );
    const quoteRows = await pg.query<{ best_total_mxn: number }>(
      `select best_total_mxn from quote_cache where destination_id = $1 and origin_iata = $2`,
      ["cancun", "MEX"],
    );
    assert.equal(quoteRows.rows[0]?.best_total_mxn, 8450);
  } finally {
    await pg.close();
  }
});
