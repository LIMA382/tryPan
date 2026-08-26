-- Complete the first English alias set used by canonical ingredient search.
update public.ingredient_catalog set aliases = array['tomato', 'fresh tomato', 'fresh tomatoes'] where lower(name) = 'tomatoes';
update public.ingredient_catalog set aliases = array['egg'] where lower(name) = 'eggs';
update public.ingredient_catalog set aliases = array['garbanzo bean', 'garbanzo beans', 'chickpea'] where lower(name) = 'chickpeas';
update public.ingredient_catalog set aliases = array['prawn', 'prawns'] where lower(name) = 'shrimp';
update public.ingredient_catalog set aliases = array['beef mince', 'minced beef'] where lower(name) = 'ground beef';
update public.ingredient_catalog set aliases = array['scallion', 'scallions', 'green onion', 'green onions'] where lower(name) = 'spring onions';
update public.ingredient_catalog set aliases = array['cilantro', 'coriander leaves'] where lower(name) = 'coriander';
update public.ingredient_catalog set aliases = array['zucchini', 'zucchinis'] where lower(name) in ('courgette', 'courgettes');
update public.ingredient_catalog set aliases = array['eggplant', 'eggplants'] where lower(name) in ('aubergine', 'aubergines');
update public.ingredient_catalog set aliases = array['arugula'] where lower(name) = 'rocket';
update public.ingredient_catalog set aliases = array['plain flour', 'all-purpose flour'] where lower(name) = 'all purpose flour';
update public.ingredient_catalog set aliases = array['powdered sugar', 'confectioners sugar'] where lower(name) = 'icing sugar';
update public.ingredient_catalog set aliases = array['bicarbonate of soda', 'sodium bicarbonate'] where lower(name) = 'baking soda';
update public.ingredient_catalog set aliases = array['heavy cream', 'heavy whipping cream'] where lower(name) = 'double cream';
update public.ingredient_catalog set aliases = array['pork mince', 'minced pork'] where lower(name) = 'ground pork';
update public.ingredient_catalog set aliases = array['soya sauce'] where lower(name) = 'soy sauce';
update public.ingredient_catalog set aliases = array['yogurt'] where lower(name) = 'yoghurt';
update public.ingredient_catalog set aliases = array['chili pepper', 'chilli peppers', 'chili peppers'] where lower(name) = 'chilli pepper';
