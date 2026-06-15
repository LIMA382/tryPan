import Link from 'next/link';
import AppNav from '@/components/AppNav';

export default function Home() {
  const days = [
    ['Mon', 'Chicken rice bowl', 'Tomato soup'],
    ['Tue', 'Turkey wraps', 'Chickpea curry'],
    ['Wed', 'Greek salad bowl', 'Salmon pasta'],
    ['Thu', 'Leftovers', 'Chicken rice bowl'],
  ];

  return (
    <>
      <AppNav />

      <main className="page-shell">
        <section className="hero">
          <div>
            <div className="eyebrow">Meal planning from real life</div>

            <h1>Plan your week from meals you already know.</h1>

            <p>
              Save your go-to meals, drag them into lunch and dinner slots, and let tryPan
              turn the week into one clean grocery list.
            </p>

            <div className="hero-actions">
              <Link className="primary-btn" href="/login">
                Start planning
              </Link>

              <Link className="soft-btn" href="/browse">
                Browse public meals
              </Link>
            </div>

            <p className="hero-note">
              Public meals are open to browse. Log in only when you want to save, plan or edit.
            </p>
          </div>

          <div className="preview-card">
            <div className="preview-header">
              <h3>This week</h3>
              <span className="badge">Lunch + dinner</span>
            </div>

            <div className="week-preview">
              {days.map(([day, lunch, dinner]) => (
                <div className="day-preview" key={day}>
                  <strong>{day}</strong>
                  <div className="meal-chip">{lunch}</div>
                  <div className="meal-chip">{dinner}</div>
                </div>
              ))}
            </div>

            <div className="float-list">
              <strong>Grocery list</strong>
              <p>Combined automatically</p>
              <ul>
                <li>Chicken breast · 1.2kg</li>
                <li>Rice · 600g</li>
                <li>Broccoli · 2 heads</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="how">
          <div className="card step">
            <b>1</b>
            <h3>Add meals</h3>
            <p>Store meals you already cook, with ingredients, servings and tags.</p>
          </div>

          <div className="card step">
            <b>2</b>
            <h3>Plan the week</h3>
            <p>Drag meals into a clean calendar with lunch and dinner slots.</p>
          </div>

          <div className="card step">
            <b>3</b>
            <h3>Shop once</h3>
            <p>Get a combined grocery list grouped by store section.</p>
          </div>
        </section>
      </main>
    </>
  );
}
