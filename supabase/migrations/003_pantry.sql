-- tryPan Step 3: pantry and supermarket trips

create table if not exists public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ingredient_id uuid references public.ingredient_catalog(id) on delete set null,
  name text not null,
  quantity numeric not null default 0,
  unit text default '',
  category text default 'Other',
  estimated_price numeric default 0,
  price_unit text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.pantry_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store text default '',
  bought_at date not null default current_date,
  notes text default '',
  created_at timestamptz default now()
);

create table if not exists public.pantry_transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.pantry_transactions(id) on delete cascade,
  ingredient_id uuid references public.ingredient_catalog(id) on delete set null,
  name text not null,
  quantity numeric not null default 0,
  unit text default '',
  category text default 'Other',
  estimated_price numeric default 0,
  price_unit text default '',
  created_at timestamptz default now()
);

alter table public.pantry_items enable row level security;
alter table public.pantry_transactions enable row level security;
alter table public.pantry_transaction_items enable row level security;

drop policy if exists "Users manage own pantry items" on public.pantry_items;
create policy "Users manage own pantry items" on public.pantry_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own pantry transactions" on public.pantry_transactions;
create policy "Users manage own pantry transactions" on public.pantry_transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage transaction items through own transactions" on public.pantry_transaction_items;
create policy "Users manage transaction items through own transactions" on public.pantry_transaction_items
  for all using (
    exists (
      select 1 from public.pantry_transactions t
      where t.id = transaction_id and t.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.pantry_transactions t
      where t.id = transaction_id and t.user_id = auth.uid()
    )
  );

create index if not exists pantry_items_user_name_idx on public.pantry_items (user_id, lower(name));
create index if not exists pantry_items_user_ingredient_idx on public.pantry_items (user_id, ingredient_id);
create index if not exists pantry_transactions_user_date_idx on public.pantry_transactions (user_id, bought_at desc);
