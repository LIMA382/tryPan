alter table public.pantry_items
  add column if not exists expiry_date date;

create index if not exists pantry_items_user_expiry_idx
  on public.pantry_items (user_id, expiry_date)
  where expiry_date is not null;
