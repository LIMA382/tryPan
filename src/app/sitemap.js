import { getPublicRecipes } from '@/lib/recipeCatalog';
import { SITE_URL } from '@/lib/site';

export default async function sitemap() {
  const recipes = await getPublicRecipes();
  const now = new Date();
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/discover`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    ...recipes.map((meal) => ({ url: `${SITE_URL}/recipes/${meal.slug}`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 })),
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];
}

