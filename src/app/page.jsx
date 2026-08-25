import Image from 'next/image';
import Link from 'next/link';
import InstallPrompt from '@/components/InstallPrompt';
import AppNav from '@/components/AppNav';
import { getCuratedRecipes } from '@/lib/recipeCatalog';
import { SITE_URL } from '@/lib/site';

export const metadata = {
  title: 'Student Meal Planner with Pantry and Grocery Lists',
  description: 'Plan affordable student meals from ingredients you already have. Create weekly meal plans, reduce food waste and generate an automatic grocery list.',
  alternates: { canonical: '/' },
};

const money = (value) => `€${Number(value || 0).toFixed(2)}`;
const faqItems = [
  { question: 'Is tryPan free?', answer: 'Yes. You can create an account, add your pantry, plan meals and build grocery lists without entering a credit card.' },
  { question: 'Do I need to track every ingredient perfectly?', answer: 'No. Start with the staples and fresh food that matter this week. You can correct a quantity whenever something changes.' },
  { question: 'Can I add my own recipes and prices?', answer: 'Yes. Add meals you already cook, edit their ingredients and servings, and adjust ingredient prices for the shops you use.' },
  { question: 'What happens to my pantry after I cook?', answer: 'Cooking mode can subtract the ingredients you used and save remaining portions as leftovers, so your pantry stays useful for the next plan.' },
];

export default function Home() {
  const featured = getCuratedRecipes().filter((meal) => ['Fluffy everyday pancakes', 'Red lentil tomato soup', 'One-pot tomato chickpea pasta'].includes(meal.title));
  const structuredData = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'SoftwareApplication', name: 'tryPan', applicationCategory: 'LifestyleApplication', operatingSystem: 'Web', url: SITE_URL, description: 'A pantry-first student meal planner for affordable weekly plans and smarter grocery lists.', offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' } },
    { '@type': 'WebSite', name: 'tryPan', url: SITE_URL, description: 'Affordable student meal planning with pantry matching and automatic grocery lists.' },
    { '@type': 'FAQPage', mainEntity: faqItems.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) },
  ] };

  return (
    <>
      <InstallPrompt />
      <AppNav />
      <main className="marketing-home">
        <section className="page-shell marketing-hero">
          <div className="marketing-hero-copy">
            <div className="eyebrow">Pantry-first planning for students</div>
            <h1>The student meal planner that starts with what you already have.</h1>
            <p>Build an affordable weekly plan, use food before it expires, and generate a grocery list containing only what you’re missing.</p>
            <div className="hero-actions">
              <Link className="primary-btn" href="/login?mode=signup">Start planning free</Link>
              <Link className="soft-btn" href="/discover">Explore recipes</Link>
            </div>
            <div className="hero-trust-row"><span>No credit card</span><span>Takes about 2 minutes</span><span>Works on mobile</span></div>
          </div>

          <div className="marketing-product-preview" aria-label="Example tryPan weekly planner">
            <div className="product-demo-topbar"><div><i /><i /><i /></div><span>Week of 25 August</span><strong>€31.40 planned</strong></div>
            <div className="product-demo-body">
              <div className="product-demo-heading"><div><span className="student-kicker">Your week</span><h2>Monday’s plan</h2></div><span className="demo-ready-pill">Pantry checked</span></div>
              <div className="product-demo-days" aria-hidden="true"><span className="active">M<b>25</b></span><span>T<b>26</b></span><span>W<b>27</b></span><span>T<b>28</b></span><span>F<b>29</b></span><span>S<b>30</b></span><span>S<b>31</b></span></div>
              <div className="product-demo-meal">
                <div><span>Dinner · 25 min</span><h3>One-pot tomato chickpea pasta</h3><p>€1.37 per serving · 4 servings</p></div>
                <div className="demo-pantry-score"><strong>4/6</strong><span>ingredients at home</span></div>
              </div>
              <div className="product-demo-list"><div><span>Already in your pantry</span><strong>Chickpeas, pasta, garlic, olive oil</strong></div><div><span>Add to grocery list</span><strong>Tomatoes and spinach</strong></div></div>
              <div className="product-demo-footer"><span>Grocery list updated automatically</span><strong>2 items to buy</strong></div>
            </div>
          </div>
        </section>

        <section className="marketing-proof-strip" aria-label="tryPan capabilities">
          <div className="page-shell"><p><strong>100+</strong><span>affordable student recipes</span></p><p><strong>Automatic</strong><span>pantry matching</span></p><p><strong>Clear costs</strong><span>per meal and serving</span></p><p><strong>Waste less</strong><span>expiry and leftover tracking</span></p></div>
        </section>

        <section className="page-shell marketing-section" aria-labelledby="how-heading">
          <div className="marketing-section-heading"><span className="eyebrow">One connected routine</span><h2 id="how-heading">From “what should I eat?” to a finished grocery list.</h2><p>Start small. tryPan does the repetitive comparison work while you stay in control of the meals and prices.</p></div>
          <div className="marketing-steps">
            <article><b>1</b><h3>Tell tryPan what is at home</h3><p>Add everyday pantry items and adjust quantities whenever real life changes.</p></article>
            <article><b>2</b><h3>Build or generate your week</h3><p>Plan familiar meals yourself or let smart planning fill the gaps around your time and budget.</p></article>
            <article><b>3</b><h3>Buy only what is missing</h3><p>Your list compares every recipe with your pantry before estimating the shop.</p></article>
          </div>
        </section>

        <section className="page-shell marketing-benefits" aria-labelledby="benefits-heading">
          <div className="marketing-section-heading"><span className="eyebrow">Why tryPan</span><h2 id="benefits-heading">Spend less money and less time deciding.</h2></div>
          <div className="marketing-feature-grid">
            <article className="marketing-feature-card"><span className="student-kicker">Spend less on groceries</span><h3>Know the cost before you plan.</h3><p>Compare meal totals and price per serving, then avoid buying ingredients already in your pantry.</p></article>
            <article className="marketing-feature-card"><span className="student-kicker">Waste less food</span><h3>Use ingredients while they are useful.</h3><p>Prioritize expiring food and keep leftover portions visible for another meal later in the week.</p></article>
            <article className="marketing-feature-card"><span className="student-kicker">Decide meals faster</span><h3>Stop starting from scratch every evening.</h3><p>Turn familiar recipes and pantry ingredients into a complete Monday-to-Sunday plan.</p></article>
          </div>
        </section>

        <section className="page-shell marketing-section" aria-labelledby="recipes-heading">
          <div className="marketing-section-heading"><span className="eyebrow">Cook something achievable</span><h2 id="recipes-heading">Affordable recipes for actual student weeks.</h2><p>Short ingredient lists, ordinary equipment and clear costs per serving.</p></div>
          <div className="home-recipe-grid">{featured.map((meal) => <Link href={`/recipes/${meal.slug}`} key={meal.slug}><Image src={meal.image} alt="" width={600} height={400} sizes="(max-width: 760px) 100vw, 33vw"/><div><span>{meal.prep_time} min</span><span>{money(meal.price / Math.max(1, meal.servings))} per serving</span></div><h3>{meal.title}</h3><p>{meal.description}</p></Link>)}</div>
          <Link className="soft-btn marketing-centered-link" href="/discover">Explore recipes</Link>
          <nav className="home-recipe-links" aria-label="Browse recipe categories"><Link href="/discover?filter=Budget">Cheap student recipes</Link><Link href="/discover?filter=Breakfast">Simple breakfasts</Link><Link href="/discover?filter=Soup">Easy soups</Link><Link href="/discover?filter=15%20minutes">15-minute meals</Link><Link href="/discover?filter=Meal%20prep">Meal-prep recipes</Link></nav>
        </section>

        <section className="page-shell marketing-faq" aria-labelledby="faq-heading">
          <div><span className="eyebrow">Questions, answered</span><h2 id="faq-heading">A planner that fits real life.</h2></div>
          <div>{faqItems.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div>
        </section>

        <section className="page-shell marketing-final-cta"><span className="eyebrow">Make next week easier</span><h2>Plan seven days. Buy only what is missing.</h2><p>Start with one meal and let your pantry do more of the work.</p><Link className="primary-btn" href="/login?mode=signup">Start planning free</Link></section>
      </main>

      <footer className="marketing-footer"><div className="page-shell"><div><strong>tryPan</strong><p>Affordable meal planning for ordinary weeks.</p></div><nav aria-label="Footer"><Link href="/discover">Recipes</Link><Link href="/photo-credits">Photo credits</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/login">Log in</Link></nav></div></footer>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    </>
  );
}
