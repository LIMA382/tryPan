# tryPan Step 2 - Ingredient catalog

This build adds the ingredient catalog foundation:

- Portugal / Netherlands ingredient price region in Account
- ingredient autocomplete when creating/editing meals
- starter ingredient price database for both regions
- user-created ingredients with price/unit/category
- meal ingredients now store catalog id, estimated price and price unit when available

## Supabase migration

Run this file in Supabase SQL Editor before using the ingredient creation feature:

`supabase/migrations/002_ingredient_catalog.sql`

Or run the full `supabase/schema.sql` on a new Supabase project.
