-- Week 1 ingredient identity: alternative English names live on the canonical catalogue row.
alter table public.ingredient_catalog
  add column if not exists aliases text[] not null default '{}';

update public.ingredient_catalog set aliases = array['tomato', 'fresh tomato', 'fresh tomatoes'] where lower(name) = 'tomatoes' and cardinality(aliases) = 0;
update public.ingredient_catalog set aliases = array['egg'] where lower(name) = 'eggs' and cardinality(aliases) = 0;
update public.ingredient_catalog set aliases = array['garbanzo bean', 'garbanzo beans', 'chickpea'] where lower(name) = 'chickpeas' and cardinality(aliases) = 0;
update public.ingredient_catalog set aliases = array['prawn', 'prawns'] where lower(name) = 'shrimp' and cardinality(aliases) = 0;
update public.ingredient_catalog set aliases = array['beef mince', 'minced beef'] where lower(name) = 'ground beef' and cardinality(aliases) = 0;
update public.ingredient_catalog set aliases = array['scallion', 'scallions', 'green onion', 'green onions'] where lower(name) = 'spring onions' and cardinality(aliases) = 0;
update public.ingredient_catalog set aliases = array['cilantro', 'coriander leaves'] where lower(name) = 'coriander' and cardinality(aliases) = 0;
update public.ingredient_catalog set aliases = array['zucchini', 'zucchinis'] where lower(name) = 'courgette' and cardinality(aliases) = 0;
