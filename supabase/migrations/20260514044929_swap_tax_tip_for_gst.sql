-- Replace `tax` and `tip` with a single `gst` column.
-- India uses GST exclusively, and there's no tipping culture, so the original
-- tax/tip pair from 20260514043659_receipts_table.sql was redundant + misleading.
-- Safe to drop directly: no production data yet.

alter table receipts drop column tax;
alter table receipts drop column tip;
alter table receipts add column gst numeric(12, 2);
