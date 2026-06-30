-- tryPan Step 6: breakfast planning, free pantry items, recap support, and more ingredients

-- Breakfast support. PostgreSQL cannot do IF NOT EXISTS for check constraints,
-- so we safely drop and recreate the slot constraint.
alter table public.planned_meals
  drop constraint if exists planned_meals_slot_check;

alter table public.planned_meals
  add constraint planned_meals_slot_check
  check (slot in ('Breakfast', 'Lunch', 'Dinner'));

-- Free/no-cost pantry items. Useful when the user already had something,
-- grew it, received it, or does not want it counted in spending recaps.
alter table public.pantry_items
  add column if not exists is_free boolean default false;

alter table public.pantry_transaction_items
  add column if not exists is_free boolean default false;

-- Keep region columns available for account preferences.
alter table public.profiles add column if not exists region text default 'pt';
alter table public.profiles add column if not exists country_region text default 'pt';

-- Add more starter ingredients for PT and NL.
insert into public.ingredient_catalog
  (name, region, category, default_unit, estimated_price, price_unit, is_user_created)
values
  ('Flour', 'pt', 'Pantry', 'g', 0.95, 'kg', false),
  ('Whole wheat flour', 'pt', 'Pantry', 'g', 1.25, 'kg', false),
  ('Sugar', 'pt', 'Pantry', 'g', 1.15, 'kg', false),
  ('Brown sugar', 'pt', 'Pantry', 'g', 1.60, 'kg', false),
  ('Salt', 'pt', 'Spices', 'g', 0.70, 'kg', false),
  ('Black pepper', 'pt', 'Spices', 'g', 16.00, 'kg', false),
  ('Paprika', 'pt', 'Spices', 'g', 15.00, 'kg', false),
  ('Cumin', 'pt', 'Spices', 'g', 18.00, 'kg', false),
  ('Cinnamon', 'pt', 'Spices', 'g', 16.00, 'kg', false),
  ('Oregano', 'pt', 'Spices', 'g', 20.00, 'kg', false),
  ('Curry powder', 'pt', 'Spices', 'g', 16.00, 'kg', false),
  ('Chili flakes', 'pt', 'Spices', 'g', 22.00, 'kg', false),
  ('Baking powder', 'pt', 'Pantry', 'g', 7.00, 'kg', false),
  ('Yeast', 'pt', 'Pantry', 'g', 12.00, 'kg', false),
  ('Butter', 'pt', 'Dairy', 'g', 7.50, 'kg', false),
  ('Mozzarella', 'pt', 'Dairy', 'g', 8.50, 'kg', false),
  ('Cheddar', 'pt', 'Dairy', 'g', 9.00, 'kg', false),
  ('Oats', 'pt', 'Pantry', 'g', 1.45, 'kg', false),
  ('Corn flakes', 'pt', 'Pantry', 'g', 4.00, 'kg', false),
  ('Bananas', 'pt', 'Produce', 'g', 1.25, 'kg', false),
  ('Apples', 'pt', 'Produce', 'g', 1.80, 'kg', false),
  ('Oranges', 'pt', 'Produce', 'g', 1.50, 'kg', false),
  ('Strawberries', 'pt', 'Produce', 'g', 5.50, 'kg', false),
  ('Blueberries', 'pt', 'Produce', 'g', 9.50, 'kg', false),
  ('Zucchini', 'pt', 'Produce', 'g', 2.10, 'kg', false),
  ('Bell pepper', 'pt', 'Produce', 'g', 3.20, 'kg', false),
  ('Eggplant', 'pt', 'Produce', 'g', 2.80, 'kg', false),
  ('Cauliflower', 'pt', 'Produce', 'g', 2.70, 'kg', false),
  ('Cabbage', 'pt', 'Produce', 'g', 1.60, 'kg', false),
  ('Pork loin', 'pt', 'Protein', 'g', 5.80, 'kg', false),
  ('Pork chops', 'pt', 'Protein', 'g', 6.20, 'kg', false),
  ('Cod', 'pt', 'Protein', 'g', 12.00, 'kg', false),
  ('White fish', 'pt', 'Protein', 'g', 9.00, 'kg', false),
  ('Lentils', 'pt', 'Pantry', 'g', 2.40, 'kg', false),
  ('Red beans', 'pt', 'Pantry', 'can', 0.95, 'can', false),
  ('Kidney beans', 'pt', 'Pantry', 'can', 0.95, 'can', false),
  ('Quinoa', 'pt', 'Pantry', 'g', 5.80, 'kg', false),
  ('Canned tomatoes', 'pt', 'Pantry', 'can', 0.85, 'can', false),
  ('Tomato paste', 'pt', 'Pantry', 'g', 4.50, 'kg', false),
  ('Honey', 'pt', 'Pantry', 'g', 7.00, 'kg', false),
  ('Vinegar', 'pt', 'Pantry', 'ml', 1.80, 'l', false),
  ('Mayonnaise', 'pt', 'Pantry', 'g', 4.00, 'kg', false),
  ('Mustard', 'pt', 'Pantry', 'g', 3.50, 'kg', false),
  ('Frozen mixed vegetables', 'pt', 'Frozen', 'g', 2.20, 'kg', false),
  ('Frozen berries', 'pt', 'Frozen', 'g', 5.50, 'kg', false),

  ('Flour', 'nl', 'Pantry', 'g', 1.25, 'kg', false),
  ('Whole wheat flour', 'nl', 'Pantry', 'g', 1.55, 'kg', false),
  ('Sugar', 'nl', 'Pantry', 'g', 1.35, 'kg', false),
  ('Brown sugar', 'nl', 'Pantry', 'g', 1.90, 'kg', false),
  ('Salt', 'nl', 'Spices', 'g', 0.90, 'kg', false),
  ('Black pepper', 'nl', 'Spices', 'g', 18.00, 'kg', false),
  ('Paprika', 'nl', 'Spices', 'g', 17.00, 'kg', false),
  ('Cumin', 'nl', 'Spices', 'g', 21.00, 'kg', false),
  ('Cinnamon', 'nl', 'Spices', 'g', 19.00, 'kg', false),
  ('Oregano', 'nl', 'Spices', 'g', 24.00, 'kg', false),
  ('Curry powder', 'nl', 'Spices', 'g', 19.00, 'kg', false),
  ('Chili flakes', 'nl', 'Spices', 'g', 26.00, 'kg', false),
  ('Baking powder', 'nl', 'Pantry', 'g', 8.50, 'kg', false),
  ('Yeast', 'nl', 'Pantry', 'g', 14.00, 'kg', false),
  ('Butter', 'nl', 'Dairy', 'g', 8.80, 'kg', false),
  ('Mozzarella', 'nl', 'Dairy', 'g', 10.00, 'kg', false),
  ('Cheddar', 'nl', 'Dairy', 'g', 10.80, 'kg', false),
  ('Oats', 'nl', 'Pantry', 'g', 1.75, 'kg', false),
  ('Corn flakes', 'nl', 'Pantry', 'g', 4.80, 'kg', false),
  ('Bananas', 'nl', 'Produce', 'g', 1.55, 'kg', false),
  ('Apples', 'nl', 'Produce', 'g', 2.20, 'kg', false),
  ('Oranges', 'nl', 'Produce', 'g', 1.90, 'kg', false),
  ('Strawberries', 'nl', 'Produce', 'g', 6.70, 'kg', false),
  ('Blueberries', 'nl', 'Produce', 'g', 11.00, 'kg', false),
  ('Zucchini', 'nl', 'Produce', 'g', 2.60, 'kg', false),
  ('Bell pepper', 'nl', 'Produce', 'g', 3.90, 'kg', false),
  ('Eggplant', 'nl', 'Produce', 'g', 3.30, 'kg', false),
  ('Cauliflower', 'nl', 'Produce', 'g', 3.20, 'kg', false),
  ('Cabbage', 'nl', 'Produce', 'g', 1.90, 'kg', false),
  ('Pork loin', 'nl', 'Protein', 'g', 7.20, 'kg', false),
  ('Pork chops', 'nl', 'Protein', 'g', 7.50, 'kg', false),
  ('Cod', 'nl', 'Protein', 'g', 15.00, 'kg', false),
  ('White fish', 'nl', 'Protein', 'g', 11.00, 'kg', false),
  ('Lentils', 'nl', 'Pantry', 'g', 2.90, 'kg', false),
  ('Red beans', 'nl', 'Pantry', 'can', 1.15, 'can', false),
  ('Kidney beans', 'nl', 'Pantry', 'can', 1.15, 'can', false),
  ('Quinoa', 'nl', 'Pantry', 'g', 6.80, 'kg', false),
  ('Canned tomatoes', 'nl', 'Pantry', 'can', 1.05, 'can', false),
  ('Tomato paste', 'nl', 'Pantry', 'g', 5.20, 'kg', false),
  ('Honey', 'nl', 'Pantry', 'g', 8.50, 'kg', false),
  ('Vinegar', 'nl', 'Pantry', 'ml', 2.20, 'l', false),
  ('Mayonnaise', 'nl', 'Pantry', 'g', 4.60, 'kg', false),
  ('Mustard', 'nl', 'Pantry', 'g', 4.20, 'kg', false),
  ('Frozen mixed vegetables', 'nl', 'Frozen', 'g', 2.60, 'kg', false),
  ('Frozen berries', 'nl', 'Frozen', 'g', 6.50, 'kg', false)
on conflict do nothing;
