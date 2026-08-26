create table if not exists public.recipe_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_id uuid references public.meals(id) on delete set null,
  recipe_key text not null,
  title text not null default '',
  slug text not null default '',
  activity_type text not null check (activity_type in ('saved', 'cooked', 'recent')),
  occurred_at timestamptz not null default now(),
  unique(user_id, recipe_key, activity_type)
);

alter table public.recipe_activity enable row level security;

drop policy if exists "Users manage own recipe activity" on public.recipe_activity;
create policy "Users manage own recipe activity" on public.recipe_activity
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists recipe_activity_user_type_date_idx
  on public.recipe_activity (user_id, activity_type, occurred_at desc);
