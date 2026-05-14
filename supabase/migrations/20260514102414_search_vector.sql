-- Full-text search over vendor + raw_text + category.
-- GENERATED ALWAYS STORED keeps the tsvector in sync automatically on every
-- INSERT/UPDATE; no triggers needed. GIN index makes match queries fast.

alter table receipts
  add column search_vector tsvector
  generated always as (
    to_tsvector(
      'english',
      coalesce(vendor, '') || ' ' ||
      coalesce(raw_text, '') || ' ' ||
      coalesce(category, '')
    )
  ) stored;

create index receipts_search_idx on receipts using gin (search_vector);
