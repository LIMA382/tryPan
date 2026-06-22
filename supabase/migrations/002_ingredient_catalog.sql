-- tryPan Step 2: ingredient catalog and regional price preferences

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

create unique index if not exists ingredient_catalog_region_name_lower_idx
  on public.ingredient_catalog (region, lower(name));
