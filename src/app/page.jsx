import InstallPrompt from '@/components/InstallPrompt';
import Link from 'next/link';
import AppNav from '@/components/AppNav';

export default function Home() {
  const days = [
    ['Mon', 'Oats bowl', 'Chicken rice bowl', 'Tomato soup'],
    ['Tue', 'Egg toast', 'Turkey wraps', 'Chickpea curry'],
    ['Wed', 'Yogurt fruit', 'Greek salad bowl', 'Salmon pasta'],
    ['Thu', 'Smoothie', 'Leftovers', 'Use-up pantry pasta'],
  ];

  return (
    <>
      <InstallPrompt />
      <AppNav />

      <main className="page-shell mobile-home-shell">
        <section className="hero mobile-hero refined-hero">
          <div>
            <div className="eyebrow">Meal planning without the nightly decision spiral</div>
            <h1>Stop deciding dinner from scratch every night.</h1>
            <p>
              tryPan helps you plan breakfast, lunch and dinner from meals you already know how to cook — then compares your plan with your pantry so you only shop for what is missing.
            </p>

            <div className="hero-actions">
              <Link className="primary-btn" href="/login">Start planning</Link>
              <Link className="soft-btn" href="/browse">Browse public meals</Link>
            </div>

            <p className="mobile-install-note">
              On iPhone, open Share → Add to Home Screen. On Android, tap Install when prompted.
            </p>
          </div>

          <div className="preview-card phone-preview-card waste-preview-card">
            <div className="preview-header">
              <h2>This week, without the 6pm panic</h2>
              <span className="badge">Pantry aware</span>
            </div>

            <div className="week-preview">
              {days.map(([day, breakfast, lunch, dinner]) => (
                <div className="day-preview mobile-day-preview" key={day}>
                  <strong>{day}</strong>
                  <div className="meal-chip">{breakfast}</div>
                  <div className="meal-chip">{lunch}</div>
                  <div className="meal-chip leftover-chip">{dinner}</div>
                </div>
              ))}
            </div>

            <div className="missing-preview">
              <strong>Missing from pantry</strong>
              <span>Tomatoes · 4</span>
              <span>Greek yogurt · 500g</span>
              <em>Already have rice, pasta and frozen peas.</em>
            </div>
          </div>
        </section>

        <section className="how mobile-how" aria-labelledby="how-heading">
          <div className="section-heading full">
            <h2 id="how-heading">A calmer way to plan the week</h2>
            <p>Start from real life: familiar meals, leftovers, pantry stock and the groceries you actually need.</p>
          </div>
          <div className="card step"><b>1</b><h3>Add meals you actually cook</h3><p>Save reliable meals, not endless recipes you may never make.</p></div>
          <div className="card step"><b>2</b><h3>Plan around real days</h3><p>Put leftovers next to busy nights and keep breakfast, lunch and dinner visible.</p></div>
          <div className="card step"><b>3</b><h3>Shop only what is missing</h3><p>Compare the plan with your pantry before you buy more food.</p></div>
        </section>
      </main>
    </>
  );
}
