import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const selections = [
  ['salmon-pasta', 'Salmon pasta', 'File:Smoked salmon pasta - Figaros, Brighton 2024-04-19.jpg'],
  ['greek-salad-bowl', 'Greek salad bowl', 'File:Greek Salad Choriatiki.jpg'],
  ['tomato-basil-soup', 'Tomato basil soup', 'File:Tomato Basil Soup.jpg'],
  ['lemon-chicken-tray-bake', 'Lemon chicken tray bake', 'File:Lemon Brined Roasted Chicken.jpg'],
  ['peanut-tofu-noodles', 'Peanut tofu noodles', 'File:Udon Nudle Tofu Zlaty Klas 2025.jpg'],
  ['tuna-avocado-toast', 'Tuna avocado toast', 'File:Tuna olive and avocado sandwich.jpg'],
  ['mushroom-risotto', 'Mushroom risotto', 'File:Mushroom and Leek Risotto (49535206656).jpg'],
  ['beef-taco-bowls', 'Beef taco bowls', 'File:Flickr pointnshoot 300569394--Beef tostada plate.jpg'],
  ['halloumi-couscous-salad', 'Halloumi couscous salad', 'File:Fruit Salad with Grilled Halloumi Cheese.jpg'],
  ['shrimp-fried-rice', 'Shrimp fried rice', 'File:Shrimp Fried Rice (Taiwan).jpg'],
  ['smoky-chickpeas-on-toast', 'Smoky chickpeas on toast', 'File:Halloumi & Crispy Chickpeas Salad - No.16 2025-08-24.jpg'],
  ['microwave-shakshuka', 'Microwave shakshuka', 'File:Shakshuka Dish.jpg'],
  ['fifteen-minute-veggie-ramen', 'Fifteen-minute veggie ramen', 'File:Mitaka Ramen.jpg'],
  ['cheesy-tuna-pesto-pasta', 'Cheesy tuna pesto pasta', 'File:Tuna on whole wheat linguine, with pesto, olive oil, and black pepper - Massachusetts.jpg'],
  ['spinach-and-red-lentil-dhal', 'Spinach and red lentil dhal', 'File:Tadka Daal (Indian lentil curry).jpg'],
  ['freezer-black-bean-quesadillas', 'Freezer black bean quesadillas', 'File:Vegetarian Black Bean Quesadilla.jpg'],
  ['one-pot-tomato-chickpea-pasta', 'One-pot tomato chickpea pasta', 'File:Pasta e ceci.jpg'],
  ['fluffy-everyday-pancakes', 'Fluffy everyday pancakes', 'File:Foodiesfeed.com pouring-honey-on-pancakes-with-walnuts.jpg'],
  ['red-lentil-tomato-soup', 'Red lentil tomato soup', 'File:Lentil Soup - Schnitzel & Co. 2026-05-16.jpg'],
  ['chickpea-curry', 'Chickpea curry', 'File:Chana Masala in Paulínia, 2023-10-16.jpg'],
];

const stripHtml = (value = '') => value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const params = new URLSearchParams({
  action: 'query', format: 'json', titles: selections.map(([, , title]) => title).join('|'),
  prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '1200',
});
const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
  headers: { 'User-Agent': 'tryPan-photo-import/1.0 (recipe photo attribution)' },
});
if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
const data = await response.json();
const pages = new Map(Object.values(data.query?.pages ?? {}).map((page) => [page.title, page]));
const outputDirectory = path.resolve('public/images/recipes/real');
await mkdir(outputDirectory, { recursive: true });

async function download(url, destination) {
  try {
    await access(destination);
    return;
  } catch {}
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2200 + attempt * 3000));
    const result = await fetch(url, { headers: { 'User-Agent': 'tryPan-photo-import/1.0' } });
    if (result.ok) {
      await writeFile(destination, Buffer.from(await result.arrayBuffer()));
      return;
    }
    if (result.status !== 429) throw new Error(`Download failed: ${result.status}`);
  }
  throw new Error('Download rate limit did not clear');
}

const credits = [];
for (const [slug, recipe, title] of selections) {
  const page = pages.get(title);
  if (!page || page.missing !== undefined) throw new Error(`Missing Commons file: ${title}`);
  const info = page.imageinfo[0];
  const metadata = info.extmetadata ?? {};
  await download(info.thumburl, path.join(outputDirectory, `${slug}.jpg`));
  credits.push({
    slug,
    recipe,
    image: `/images/recipes/real/${slug}.jpg`,
    sourceTitle: title.replace(/^File:/, ''),
    sourceUrl: info.descriptionurl,
    creator: stripHtml(metadata.Artist?.value) || 'Wikimedia Commons contributor',
    license: metadata.LicenseShortName?.value || metadata.UsageTerms?.value || 'See source',
    licenseUrl: metadata.LicenseUrl?.value || info.descriptionurl,
  });
  console.log(`Downloaded ${recipe}`);
}

await writeFile('src/lib/recipePhotoCredits.json', `${JSON.stringify(credits, null, 2)}\n`);
