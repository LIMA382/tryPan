import Image from 'next/image';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import RecipeActions from '@/components/RecipeActions';
import RecipeNavigation from '@/components/RecipeNavigation';
import { getCuratedRecipes, getPublicRecipes, getRecipeBySlug } from '@/lib/recipeCatalog';
import { SITE_URL } from '@/lib/site';

const money = (value) => `€${Number(value || 0).toFixed(2)}`;

function instructionSteps(instructions) {
  return String(instructions || '').split(/(?<=[.!?])\s+/).map((step) => step.trim()).filter(Boolean);
}
export function generateStaticParams() {
  return getCuratedRecipes().map((meal) => ({ id: meal.slug }));
}

export async function generateMetadata({ params }) {
  const meal = await getRecipeBySlug(params.id);
  if (!meal) return { title: 'Recipe not found', robots: { index: false, follow: false } };
  const canonical = `/recipes/${meal.slug}`;
  const description = `${meal.description} Ready in ${meal.prep_time} minutes for about ${money(Number(meal.price || 0) / Math.max(1, meal.servings))} per serving.`;
  return {
    title: `${meal.title} — affordable student recipe`,
    description,
    alternates: { canonical },
    openGraph: { type: 'article', url: canonical, title: meal.title, description, images: [{ url: meal.image, width: 1200, height: 800, alt: meal.title }] },
    twitter: { card: 'summary_large_image', title: meal.title, description, images: [meal.image] },
  };
}

export default async function RecipePage({ params }) {
  const meal = await getRecipeBySlug(params.id);
  if (!meal) notFound();
  if (decodeURIComponent(params.id) !== meal.slug) permanentRedirect(`/recipes/${meal.slug}`);

  const steps = instructionSteps(meal.instructions);
  const recipes = await getPublicRecipes();
  const related = recipes.filter((item) => item.slug !== meal.slug && item.meal_type === meal.meal_type).slice(0, 3);
  const canonicalUrl = `${SITE_URL}/recipes/${meal.slug}`;
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Recipe', name: meal.title, description: meal.description,
    image: [`${SITE_URL}${meal.image}`],
    author: { '@type': meal.creator === 'tryPan Student Kitchen' ? 'Organization' : 'Person', name: meal.creator },
    prepTime: `PT${meal.prep_time}M`, totalTime: `PT${meal.prep_time}M`,
    recipeYield: `${meal.servings} ${meal.servings === 1 ? 'serving' : 'servings'}`,
    recipeCategory: meal.meal_type, keywords: meal.tags.join(', '),
    recipeIngredient: meal.ingredients.map((item) => `${item.quantity} ${item.unit} ${item.name}`.trim()),
    recipeInstructions: steps.map((text, index) => ({ '@type': 'HowToStep', position: index + 1, text, url: `${canonicalUrl}#step-${index + 1}` })),
    mainEntityOfPage: canonicalUrl,
  };

  return (
    <>
      <RecipeNavigation />
      <main className="page-shell recipe-detail-page page-transition">
        <nav className="recipe-breadcrumb" aria-label="Breadcrumb"><Link href="/discover">Discover</Link><span aria-hidden="true">›</span><span>{meal.title}</span></nav>
        <article className="recipe-detail-layout">
          <header className="recipe-detail-hero panel-soft recipe-hero-with-image">
            <div className="recipe-hero-copy">
              <div className="eyebrow">Affordable student recipe</div>
              <h1>{meal.title}</h1><p>{meal.description}</p>
              <div className="badges">{meal.tags.map((tag) => <span className="badge" key={tag}>{tag}</span>)}</div>
              <div className="recipe-facts">
                <div><span>Ready in</span><strong>{meal.prep_time} min</strong></div>
                <div><span>Serves</span><strong>{meal.servings}</strong></div>
                <div><span>Estimated total</span><strong>{money(meal.price)}</strong></div>
                <div><span>Per serving</span><strong>{money(Number(meal.price || 0) / Math.max(1, meal.servings))}</strong></div>
              </div>
            </div>
            <div className="recipe-cover-wrap"><Image className="recipe-cover" src={meal.image} alt={`${meal.title}, an affordable student meal`} width={1200} height={800} priority sizes="(max-width: 900px) 100vw, 46vw" /></div>
          </header>

          <div className="recipe-detail-content">
            <section className="panel-soft recipe-section">
              <div className="recipe-section-heading"><div><span className="student-kicker">What you need</span><h2>Ingredients</h2></div><span>{meal.servings} {meal.servings === 1 ? 'serving' : 'servings'}</span></div>
              <div className="recipe-ingredient-list">{meal.ingredients.map((ingredient, index) => <div key={ingredient.id || `${ingredient.name}-${index}`}><strong>{ingredient.name}</strong><span>{ingredient.quantity} {ingredient.unit}</span></div>)}</div>
            </section>
            <section className="panel-soft recipe-section" id="instructions">
              <span className="student-kicker">Simple method</span><h2>How to make it</h2>
              {steps.length ? <ol className="recipe-step-list">{steps.map((step, index) => <li id={`step-${index + 1}`} key={`${index}-${step}`}><span>{index + 1}</span><p>{step}</p></li>)}</ol> : <p className="recipe-instructions">The creator has not added instructions yet.</p>}
              {meal.video_url ? <a className="soft-btn" href={meal.video_url} target="_blank" rel="noreferrer">Watch recipe video</a> : null}
            </section>
          </div>

          <RecipeActions meal={meal} />
        </article>

        {related.length ? <section className="related-recipes" aria-labelledby="related-heading"><div><span className="eyebrow">Keep exploring</span><h2 id="related-heading">More {meal.meal_type === 'both' ? 'student meals' : `${meal.meal_type} ideas`}</h2></div><div className="related-recipe-grid">{related.map((item) => <Link href={`/recipes/${item.slug}`} key={item.slug}><Image src={item.image} alt="" width={600} height={400} sizes="(max-width: 760px) 100vw, 33vw"/><strong>{item.title}</strong><span>{item.prep_time} min · {money(item.price / Math.max(1, item.servings))} per serving</span></Link>)}</div></section> : null}
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    </>
  );
}
