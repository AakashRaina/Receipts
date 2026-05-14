-- receipts table
-- Mirrors src/lib/schemas/receipt.ts (Zod) plus operational columns:
--   id, user_id, image_path, status, error_message, created_at, updated_at.
-- Extracted fields start nullable so a row can exist in 'pending' before extraction.

create extension if not exists pgcrypto;

create type receipt_status as enum ('pending', 'processing', 'ready', 'failed');

create table receipts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  image_path          text not null,
  status              receipt_status not null default 'pending',
  error_message       text,

  -- extracted fields (populated by api/extract.ts; null until 'ready')
  vendor              text,
  vendor_normalized   text,
  date                date,
  total               numeric(12, 2),
  currency            text,
  tax                 numeric(12, 2),
  tip                 numeric(12, 2),
  category            text,
  payment_method      text,
  line_items          jsonb,
  raw_text            text,
  confidence          jsonb,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index receipts_user_id_created_at_idx on receipts (user_id, created_at desc);
create index receipts_user_id_date_idx       on receipts (user_id, date desc);
create index receipts_user_id_category_idx   on receipts (user_id, category);

-- keep updated_at fresh on every UPDATE
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger receipts_set_updated_at
  before update on receipts
  for each row execute function set_updated_at();
