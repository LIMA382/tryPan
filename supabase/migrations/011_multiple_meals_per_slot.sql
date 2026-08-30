alter table public.planned_meals
  drop constraint if exists planned_meals_weekly_plan_id_day_of_week_slot_key;

alter table public.planned_meals
  add constraint planned_meals_week_slot_meal_key
  unique (weekly_plan_id, day_of_week, slot, meal_id);
