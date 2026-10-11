-- Migration 0003: Enhanced quote_cache columns, partial/composite indexes,
-- and service_cache table for auxiliary public APIs (FX rate, geocoding, weather).
-- Strictly anonymous public travel data — no user PII is ever stored.

alter table quote_cache
  add column if not exists destination_id text,
  add column if not exists origin_iata text,
  add column if not exists check_in text,
  add column if not exists best_total_mxn integer,
  add column if not exists expires_at timestamptz not null default (now() + interval '5 minutes'),
  add column if not exists hit_count integer not null default 0;

-- Index for fast TTL expiration checks and background purging of stale rows
create index if not exists quote_cache_expires_at_idx
  on quote_cache (expires_at);

-- Composite index for destination + origin lookups ordered by freshness
create index if not exists quote_cache_dest_origin_fetched_idx
  on quote_cache (destination_id, origin_iata, fetched_at desc);

-- Partial index for discovering lowest recent total per destination
create index if not exists quote_cache_dest_best_price_idx
  on quote_cache (destination_id, best_total_mxn)
  where best_total_mxn is not null;

-- Auxiliary service cache for slower-changing anonymous lookups:
--   - USD/MXN exchange rate (30 min TTL)
--   - Mexican city geocoding coordinates (7 day TTL)
--   - Daily weather forecasts (30 min TTL)
create table if not exists service_cache (
  cache_key text primary key,
  category text not null,
  payload text not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists service_cache_expires_at_idx
  on service_cache (expires_at);

create index if not exists service_cache_category_fetched_idx
  on service_cache (category, fetched_at desc);
