# tryPan fixed full project

This zip is a full project root. Upload the contents of this folder to the root of the GitHub repo, replacing the current files.

Important: do not upload files so that they become nested inside another folder. GitHub root must contain package.json and src/.

Required Supabase SQL:

alter table public.meals add column if not exists price numeric default 0;
alter table public.meals add column if not exists instructions text default '';
alter table public.meals add column if not exists video_url text default '';
