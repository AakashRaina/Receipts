-- Swap min_amount/max_amount parameters for payment_filter across the aggregate RPCs.
-- Min/max amount turned out to be low-value for personal use; payment method slicing is more useful.
-- Functions must be DROPped first because the parameter list (signature) changes.

drop function if exists spend_summary(date, date, text, text, numeric, numeric);
drop function if exists category_breakdown(date, date, text, text, numeric, numeric);
drop function if exists top_vendors(date, date, text, text, numeric, numeric, int);

create or replace function spend_summary(
  from_date date default null,
  to_date date default null,
  category_filter text default null,
  vendor_filter text default null,
  payment_filter text default null
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
    and (payment_filter  is null or payment_method = payment_filter);
$$;

create or replace function category_breakdown(
  from_date date default null,
  to_date date default null,
  category_filter text default null,
  vendor_filter text default null,
  payment_filter text default null
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
    and (payment_filter  is null or payment_method = payment_filter)
  group by category
  order by total desc;
$$;

create or replace function top_vendors(
  from_date date default null,
  to_date date default null,
  category_filter text default null,
  vendor_filter text default null,
  payment_filter text default null,
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
    and (payment_filter  is null or payment_method = payment_filter)
  group by vendor_normalized
  order by total desc
  limit result_limit;
$$;
