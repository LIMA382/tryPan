-- tryPan Supabase schema
-- Run this in Supabase SQL Editor once after creating your project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz default now()
);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  meal_type text not null default 'both' check (meal_type in ('lunch','dinner','both')),
  prep_time integer default 20,
  servings integer default 2,
  price numeric default 0,
  instructions text default '',
  video_url text default '',
  tags text[] default '{}',
  is_public boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.meal_ingredients (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  name text not null,
  quantity numeric not null default 1,
  unit text default '',
  category text default 'Other',
  created_at timestamptz default now()
);

create table if not exists public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start_date date not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, week_start_date)
);

create table if not exists public.planned_meals (
  id uuid primary key default gen_random_uuid(),
  weekly_plan_id uuid not null references public.weekly_plans(id) on delete cascade,
  meal_id uuid not null references public.meals(id) on delete cascade,
  day_of_week text not null check (day_of_week in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  slot text not null check (slot in ('Lunch','Dinner')),
  servings integer default 1,
  created_at timestamptz default now(),
  unique(weekly_plan_id, day_of_week, slot)
);

create table if not exists public.saved_public_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_meal_id uuid not null references public.meals(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, source_meal_id)
);

alter table public.profiles enable row level security;
alter table public.meals enable row level security;
alter table public.meal_ingredients enable row level security;
alter table public.weekly_plans enable row level security;
alter table public.planned_meals enable row level security;
alter table public.saved_public_meals enable row level security;

create policy "Profiles are owned by user" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users can read their meals and public meals" on public.meals
  for select using (auth.uid() = user_id or is_public = true);
create policy "Users can insert own meals" on public.meals
  for insert with check (auth.uid() = user_id);
create policy "Users can update own meals" on public.meals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own meals" on public.meals
  for delete using (auth.uid() = user_id);

create policy "Ingredients visible for own or public meals" on public.meal_ingredients
  for select using (
    exists (
      select 1 from public.meals m
      where m.id = meal_id and (m.user_id = auth.uid() or m.is_public = true)
    )
  );
create policy "Users manage ingredients on own meals" on public.meal_ingredients
  for all using (
    exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid())
  );

create policy "Users manage own weekly plans" on public.weekly_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage planned meals through own plans" on public.planned_meals
  for all using (
    exists (select 1 from public.weekly_plans p where p.id = weekly_plan_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.weekly_plans p where p.id = weekly_plan_id and p.user_id = auth.uid())
  );

create policy "Users manage own saved public meals" on public.saved_public_meals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- vNext migration columns
alter table public.meals add column if not exists price numeric default 0;
alter table public.meals add column if not exists instructions text default '';
alter table public.meals add column if not exists video_url text default '';

-- Step 2: ingredient catalog + regional price preferences
alter table public.profiles add column if not exists region text default 'pt';
alter table public.profiles add column if not exists country_region text default 'pt';

create table if not exists public.ingredient_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text not null default 'pt' check (region in ('pt','nl')),
  category text default 'Other',
  default_unit text default '',
  estimated_price numeric default 0,
  price_unit text default '',
  created_by uuid references auth.users(id) on delete set null,
  is_user_created boolean default false,
  created_at timestamptz default now()
);

alter table public.meal_ingredients add column if not exists ingredient_id uuid references public.ingredient_catalog(id) on delete set null;
alter table public.meal_ingredients add column if not exists estimated_price numeric default 0;
alter table public.meal_ingredients add column if not exists price_unit text default '';

alter table public.ingredient_catalog enable row level security;

drop policy if exists "Ingredient catalog is public readable" on public.ingredient_catalog;
create policy "Ingredient catalog is public readable" on public.ingredient_catalog
  for select using (true);

drop policy if exists "Authenticated users can create ingredients" on public.ingredient_catalog;
create policy "Authenticated users can create ingredients" on public.ingredient_catalog
  for insert with check (auth.uid() = created_by);

drop policy if exists "Users can update their created ingredients" on public.ingredient_catalog;
create policy "Users can update their created ingredients" on public.ingredient_catalog
  for update using (auth.uid() = created_by) with check (auth.uid() = created_by);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, region, country_region)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'region', 'pt'),
    coalesce(new.raw_user_meta_data->>'region', 'pt')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create unique index if not exists ingredient_catalog_region_name_lower_idx
  on public.ingredient_catalog (region, lower(name));
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
