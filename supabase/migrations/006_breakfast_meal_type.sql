-- Allows meals to be explicitly marked as breakfast while keeping existing lunch/dinner/both meals valid.
alter table public.meals
  drop constraint if exists meals_meal_type_check;

alter table public.meals
  add constraint meals_meal_type_check
  check (meal_type in ('breakfast', 'lunch', 'dinner', 'both'));
