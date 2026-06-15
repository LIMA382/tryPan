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
