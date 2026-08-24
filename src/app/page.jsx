import Image from 'next/image';
import Link from 'next/link';
import InstallPrompt from '@/components/InstallPrompt';
import AppNav from '@/components/AppNav';
import { getCuratedRecipes } from '@/lib/recipeCatalog';
import { SITE_URL } from '@/lib/site';

export const metadata = {
  title: 'Student meal planner for cheaper, pantry-first weeks',
  description: 'Turn the food you already have into an affordable weekly meal plan and a grocery list containing only what is missing.',
  alternates: { canonical: '/' },
};

const money = (value) => `€${Number(value || 0).toFixed(2)}`;

export default function Home() {
  const featured = getCuratedRecipes().filter((meal) => ['Fluffy everyday pancakes', 'Red lentil tomato soup', 'One-pot tomato chickpea pasta'].includes(meal.title));
  const structuredData = {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'tryPan',
    applicationCategory: 'LifestyleApplication', operatingSystem: 'Web', url: SITE_URL,
    description: 'A pantry-first student meal planner for affordable weekly plans and smarter grocery lists.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
  };

  return (
    <>
      <InstallPrompt />
      <AppNav />
      <main className="marketing-home">
        <section className="page-shell marketing-hero">
          <div className="marketing-hero-copy">
            <div className="eyebrow">The pantry-first planner for student life</div>
            <h1>Plan a cheaper week from food you already have.</h1>
            <p>tryPan turns your pantry, budget and favourite meals into a realistic weekly plan—then builds a grocery list containing only what you are missing.</p>
            <div className="hero-actions">
              <Link className="primary-btn" href="/login?mode=signup">Build my free week</Link>
              <Link className="soft-btn" href="/discover">Explore affordable recipes</Link>
            </div>
            <div className="hero-trust-row"><span>Free to start</span><span>No credit card</span><span>Works on mobile</span></div>
          </div>

          <div className="marketing-product-preview">
            <Image src="/images/recipes/student-rice-bowl.jpg" alt="An affordable rice bowl planned with tryPan" width={1200} height={800} priority sizes="(max-width: 900px) 100vw, 48vw" />
            <div className="preview-budget-chip"><span>Estimated week</span><strong>€31.40</strong></div>
            <div className="preview-pantry-list">
              <span className="student-kicker">Pantry check</span>
              <strong>8 ingredients already at home</strong>
              <small>Only 6 items added to your grocery list</small>
            </div>
          </div>
        </section>

        <section className="marketing-proof-strip" aria-label="tryPan catalogue facts">
          <div className="page-shell"><p><strong>100+</strong><span>simple student recipes</span></p><p><strong>220</strong><span>general English ingredients</span></p><p><strong>7 days</strong><span>planned Monday to Sunday</span></p><p><strong>1 list</strong><span>checked against your pantry</span></p></div>
        </section>

        <section className="page-shell marketing-section" aria-labelledby="how-heading">
          <div className="marketing-section-heading"><span className="eyebrow">One connected routine</span><h2 id="how-heading">From “what should I eat?” to a finished grocery list.</h2><p>Start small. tryPan does the repetitive comparison work while you stay in control of the meals and prices.</p></div>
          <div className="marketing-steps">
            <article><b>1</b><h3>Tell tryPan what is at home</h3><p>Add everyday pantry items and adjust quantities whenever real life changes.</p></article>
            <article><b>2</b><h3>Build or generate your week</h3><p>Plan familiar meals yourself or let smart planning fill the gaps around your time and budget.</p></article>
            <article><b>3</b><h3>Buy only what is missing</h3><p>Your list compares every recipe with your pantry before estimating the shop.</p></article>
          </div>
        </section>

        <section className="page-shell marketing-feature-grid" aria-label="Product benefits">
          <article className="marketing-feature-card feature-budget">
            <span className="student-kicker">Budget without spreadsheets</span><h2>See the cost before you commit.</h2><p>Compare total meal cost, price per serving and expected grocery spending before the week begins.</p>
            <div className="feature-stat"><span>Weekly target</span><strong>€40.00</strong><em>€8.60 left</em></div>
          </article>
          <article className="marketing-feature-card feature-rescue">
            <span className="student-kicker">Waste less</span><h2>Cook the food that needs you first.</h2><p>Expiry reminders, pantry matching and leftover portions help useful food avoid the bin.</p>
            <ul><li><span>Spinach</span><strong>Use tomorrow</strong></li><li><span>Cooked rice</span><strong>2 portions</strong></li><li><span>Tomato soup</span><strong>Ready to freeze</strong></li></ul>
          </article>
        </section>

        <section className="page-shell marketing-section" aria-labelledby="recipes-heading">
          <div className="marketing-section-heading"><span className="eyebrow">Cook something achievable</span><h2 id="recipes-heading">Affordable recipes for actual student weeks.</h2><p>Short ingredient lists, ordinary equipment and clear costs per serving.</p></div>
          <div className="home-recipe-grid">{featured.map((meal) => <Link href={`/recipes/${meal.slug}`} key={meal.slug}><Image src={meal.image} alt="" width={600} height={400} sizes="(max-width: 760px) 100vw, 33vw"/><div><span>{meal.prep_time} min</span><span>{money(meal.price / Math.max(1, meal.servings))} per serving</span></div><h3>{meal.title}</h3><p>{meal.description}</p></Link>)}</div>
          <Link className="soft-btn marketing-centered-link" href="/discover">Browse all student recipes</Link>
        </section>

        <section className="page-shell marketing-faq" aria-labelledby="faq-heading">
          <div><span className="eyebrow">Questions, answered</span><h2 id="faq-heading">A planner that fits real life.</h2></div>
          <div>
            <details><summary>Do I need to track every ingredient perfectly?</summary><p>No. Start with the staples and fresh food that affect this week. You can correct quantities with one tap whenever something changes.</p></details>
            <details><summary>Can I use my own recipes?</summary><p>Yes. Save meals you already cook, edit their ingredients and keep them private, or explore tryPan’s public student recipes.</p></details>
            <details><summary>Does it work at the supermarket?</summary><p>Yes. tryPan is mobile-friendly, installable from your browser and keeps a useful offline version of key pages and saved data.</p></details>
            <details><summary>What happens after I cook?</summary><p>Cooking mode can deduct used ingredients and save any remaining portions as leftovers for later in the week.</p></details>
          </div>
        </section>

        <section className="page-shell marketing-final-cta"><span className="eyebrow">Make next week easier</span><h2>Plan seven days. Buy only what is missing.</h2><p>Start with one meal and let your pantry do more of the work.</p><Link className="primary-btn" href="/login?mode=signup">Create my free account</Link></section>
      </main>

      <footer className="marketing-footer"><div className="page-shell"><div><strong>tryPan</strong><p>Affordable meal planning for ordinary weeks.</p></div><nav aria-label="Footer"><Link href="/discover">Recipes</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/login">Log in</Link></nav></div></footer>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    </>
  );
}
