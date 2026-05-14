-- Aggregate functions for the spend summary panel.
-- All run as security invoker (default) so the receipts RLS policy still applies —
-- aggregates only include the caller's own rows.
-- Parameters are nullable; null means "no constraint on that filter".

create or replace function spend_summary(
  from_date date default null,
  to_date date default null,
  category_filter text default null,
  vendor_filter text default null,
  min_amount numeric default null,
  max_amount numeric default null
) returns table(total numeric, count int)
language sql stable as $$
  select coalesce(sum(total), 0)::numeric as total,
         count(*)::int as count
  from receipts
  where status = 'ready'
    and (from_date       is null or date >= from_date)
    and (to_date         is null or date <= to_date)
    and (category_filter is null or category = category_filter)
    and (vendor_filter   is null or vendor_normalized = vendor_filter)
    and (min_amount      is null or total >= min_amount)
    and (max_amount      is null or total <= max_amount);
$$;

create or replace function category_breakdown(
  from_date date default null,
  to_date date default null,
  category_filter text default null,
  vendor_filter text default null,
  min_amount numeric default null,
  max_amount numeric default null
) returns table(category text, total numeric, count int)
language sql stable as $$
  select category,
         coalesce(sum(total), 0)::numeric as total,
         count(*)::int as count
  from receipts
  where status = 'ready'
    and category is not null
    and (from_date       is null or date >= from_date)
    and (to_date         is null or date <= to_date)
    and (category_filter is null or category = category_filter)
    and (vendor_filter   is null or vendor_normalized = vendor_filter)
    and (min_amount      is null or total >= min_amount)
    and (max_amount      is null or total <= max_amount)
  group by category
  order by total desc;
$$;

create or replace function top_vendors(
  from_date date default null,
  to_date date default null,
  category_filter text default null,
  vendor_filter text default null,
  min_amount numeric default null,
  max_amount numeric default null,
  result_limit int default 5
) returns table(vendor_normalized text, total numeric, count int)
language sql stable as $$
  select vendor_normalized,
         coalesce(sum(total), 0)::numeric as total,
         count(*)::int as count
  from receipts
  where status = 'ready'
    and vendor_normalized is not null
    and (from_date       is null or date >= from_date)
    and (to_date         is null or date <= to_date)
    and (category_filter is null or category = category_filter)
    and (vendor_filter   is null or vendor_normalized = vendor_filter)
    and (min_amount      is null or total >= min_amount)
    and (max_amount      is null or total <= max_amount)
  group by vendor_normalized
  order by total desc
  limit result_limit;
$$;
