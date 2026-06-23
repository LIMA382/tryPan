# tryPan real app

A real Next.js + Supabase version of tryPan.

tryPan lets users:

- create an account
- save meals they already know how to cook
- add ingredients to each meal
- mark meals public or private
- browse public meals from other users
- save public meals into their own meal library
- drag meals into a weekly lunch/dinner planner
- generate a combined grocery list from the weekly plan

The app also has local demo mode: if Supabase environment variables are missing, it falls back to browser localStorage so the UI still works.

## Tech stack

- Next.js App Router
- React
- Supabase Auth
- Supabase Postgres
- Row-level security policies
- Vercel-ready deployment

## Local run

```bash
npm install
npm run dev
```

Open:

```bash
http://localhost:3000
```

## Supabase setup

1. Create a Supabase project.
2. Go to SQL Editor.
3. Run the full file:

```bash
supabase/schema.sql
```

4. Go to Project Settings → API.
5. Copy:
   - Project URL
   - anon public key
6. Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

7. Restart the dev server.

For quick testing, Supabase Auth → Providers → Email can have email confirmation disabled. If confirmation is enabled, users need to confirm by email before login.

## Vercel deployment

1. Push this folder to GitHub.
2. Import the project in Vercel.
3. Framework preset: Next.js.
4. Add environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

5. Deploy.

## Important files

```text
src/lib/dataStore.js        Supabase/localStorage data layer
src/lib/supabaseClient.js   Supabase client
supabase/schema.sql         Database tables + RLS policies
src/app/planner/page.jsx    Drag-and-drop weekly planner
src/app/meals/page.jsx      My Meals database
src/app/grocery/page.jsx    Grocery list generation
src/app/browse/page.jsx     Public meals browser
```

## vNext migration

Run this in Supabase SQL Editor if your project already exists:

```sql
alter table public.meals add column if not exists price numeric default 0;
alter table public.meals add column if not exists instructions text default '';
alter table public.meals add column if not exists video_url text default '';
```
