-- tryPan Step 5 fix: profile region columns + auto-calculated meal price support

alter table public.profiles add column if not exists region text default 'pt';
alter table public.profiles add column if not exists country_region text default 'pt';

alter table public.meals add column if not exists price numeric default 0;
alter table public.meals add column if not exists instructions text default '';
alter table public.meals add column if not exists video_url text default '';

alter table public.meal_ingredients add column if not exists ingredient_id uuid references public.ingredient_catalog(id) on delete set null;
alter table public.meal_ingredients add column if not exists estimated_price numeric default 0;
alter table public.meal_ingredients add column if not exists price_unit text default '';

update public.profiles
set region = coalesce(region, country_region, 'pt'),
    country_region = coalesce(country_region, region, 'pt');

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
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    region = coalesce(public.profiles.region, excluded.region),
    country_region = coalesce(public.profiles.country_region, excluded.country_region);

  return new;
end;
$$ language plpgsql security definer;
