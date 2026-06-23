import InstallPrompt from '@/components/InstallPrompt';
import Link from 'next/link';
import AppNav from '@/components/AppNav';

export default function Home() {
  const days = [
    ['Mon', 'Oats bowl', 'Chicken rice bowl', 'Tomato soup'],
    ['Tue', 'Egg toast', 'Turkey wraps', 'Chickpea curry'],
    ['Wed', 'Yogurt fruit', 'Greek salad bowl', 'Salmon pasta'],
    ['Thu', 'Smoothie', 'Leftovers', 'Chicken rice bowl'],
  ];

  return (
    <>
      <InstallPrompt />
      <AppNav />

      <main className="page-shell mobile-home-shell">
        <section className="hero mobile-hero">
          <div>
            <div className="eyebrow">tryPan phone app</div>
            <h1>Plan your week from meals you already know.</h1>
            <p>
              Save meals, plan breakfast, lunch and dinner, track your pantry,
              and make smarter grocery lists from your phone.
            </p>

            <div className="hero-actions">
              <Link className="primary-btn" href="/login">Start planning</Link>
              <Link className="soft-btn" href="/browse">Browse public meals</Link>
            </div>

            <p className="mobile-install-note">
              On iPhone, open Share → Add to Home Screen. On Android, tap Install when prompted.
            </p>
          </div>

          <div className="preview-card phone-preview-card">
            <div className="preview-header">
              <h3>This week</h3>
              <span className="badge">Phone ready</span>
            </div>

            <div className="week-preview">
              {days.map(([day, breakfast, lunch, dinner]) => (
                <div className="day-preview mobile-day-preview" key={day}>
                  <strong>{day}</strong>
                  <div className="meal-chip">{breakfast}</div>
                  <div className="meal-chip">{lunch}</div>
                  <div className="meal-chip">{dinner}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="how mobile-how">
          <div className="card step"><b>1</b><h3>Add meals</h3><p>Save meals you already cook, with ingredients and tags.</p></div>
          <div className="card step"><b>2</b><h3>Plan the week</h3><p>Tap meals into breakfast, lunch and dinner slots.</p></div>
          <div className="card step"><b>3</b><h3>Shop smarter</h3><p>Compare your plan with your pantry before shopping.</p></div>
        </section>
      </main>
    </>
  );
}
