# tryPan Step 3 — Pantry

This build adds the Pantry section.

## New features

- New `/pantry` page in the top navigation.
- Add supermarket trips with store, date, notes and bought ingredients.
- Pantry quantities update automatically when a trip is added.
- Current pantry can be manually edited at any time.
- Recent supermarket trips are stored for history.
- Ingredient picker/search is reused for pantry entries.
- Build tested with `npm run build`.

## Supabase

Run `supabase/migrations/003_pantry.sql` in Supabase SQL Editor before testing the Pantry page.
