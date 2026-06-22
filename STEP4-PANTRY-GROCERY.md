# Step 4 — Pantry-aware planner and grocery list

This step connects the pantry to the weekly planner and grocery list.

## Added

- Grocery list now compares planned meal ingredients against current pantry quantities.
- Grocery page shows:
  - planned meal count
  - total needed items
  - missing item count
  - pantry coverage percentage
  - estimated meal total
- Grocery page can switch between:
  - Only missing ingredients
  - All planned ingredients
- Planner grocery preview now shows what is missing from the pantry, not the full raw list.
- Unit matching supports simple conversions such as:
  - kg ↔ g
  - l ↔ ml
  - units/cans/heads/slices/bunches/etc.
- If pantry has enough of an ingredient, it is marked as covered.
- If pantry is short, the missing amount is shown as the shopping amount.

## Database

No new SQL migration is required for Step 4 if Steps 2 and 3 were already applied.
