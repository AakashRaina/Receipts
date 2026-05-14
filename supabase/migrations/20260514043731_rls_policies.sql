-- RLS for the receipts table.
-- A user can only see/modify their own rows. auth.uid() is read from the JWT.

alter table receipts enable row level security;

create policy "select own receipts"
  on receipts for select
  using (user_id = auth.uid());

create policy "insert own receipts"
  on receipts for insert
  with check (user_id = auth.uid());

create policy "update own receipts"
  on receipts for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "delete own receipts"
  on receipts for delete
  using (user_id = auth.uid());

-- Storage policies for the 'receipts' bucket.
-- Files live at {user_id}/{receipt_id}.{ext}. The first path segment must match auth.uid().

create policy "users read own receipt files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users upload own receipt files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users update own receipt files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users delete own receipt files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
