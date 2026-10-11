-- Public price snapshots only. No names, accounts, or free-text about a person.
create table if not exists quote_cache (
  cache_key text primary key,
  payload text not null,
  fetched_at timestamptz not null default now()
);

create index if not exists quote_cache_fetched_at_idx on quote_cache (fetched_at desc);
