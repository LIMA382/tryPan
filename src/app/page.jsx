import InstallPrompt from '@/components/InstallPrompt';
import Link from 'next/link';
import AppNav from '@/components/AppNav';

const week = [
  ['Monday', 'Oats bowl', 'Chicken rice bowl', 'Tomato soup'],
  ['Tuesday', 'Egg toast', 'Turkey wraps', 'Chickpea curry'],
  ['Wednesday', 'Yogurt and fruit', 'Greek salad bowl', 'Salmon pasta'],
  ['Thursday', 'Smoothie', 'Leftovers', 'Pantry pasta'],
];

export default function Home() {
  return (
    <>
      <InstallPrompt />
      <AppNav />
      <main className="home-page">
        <section className="home-intro">
          <p className="home-kicker">Meal planning for ordinary weeks</p>
          <h1>Make dinner decisions effortless, every night.</h1>
          <p className="home-summary">Plan meals you already know, check what is in the pantry, and buy only what is missing.</p>
          <div className="home-actions">
            <Link className="home-primary-action" href="/login">Start planning</Link>
            <Link className="home-text-action" href="/browse">See public meals</Link>
          </div>
        </section>

        <section className="home-demo" aria-labelledby="demo-heading">
          <header>
            <div><p className="home-section-label">A working week</p><h2 id="demo-heading">Your plan and pantry, together</h2></div>
            <Link href="/planner">Open the planner</Link>
          </header>
          <div className="home-table-wrap">
            <table>
              <thead><tr><th>Day</th><th>Breakfast</th><th>Lunch</th><th>Dinner</th></tr></thead>
              <tbody>{week.map(([day, breakfast, lunch, dinner]) => <tr key={day}><th>{day}</th><td>{breakfast}</td><td>{lunch}</td><td>{dinner}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="home-pantry-status">
            <strong>Shopping list</strong><span>Tomatoes, 4</span><span>Greek yogurt, 500 g</span><span className="home-have">Already in the pantry: rice, pasta and frozen peas</span>
          </div>
        </section>

        <section className="home-process" aria-labelledby="process-heading">
          <header><div><p className="home-section-label">How it works</p><h2 id="process-heading">A practical weekly routine</h2></div></header>
          <ol>
            <li><span>01</span><div><h3>Save your regular meals</h3><p>Keep the meals you actually cook in one useful list.</p></div></li>
            <li><span>02</span><div><h3>Build the week</h3><p>Place quick dinners and leftovers where they fit your schedule.</p></div></li>
            <li><span>03</span><div><h3>Check before shopping</h3><p>Compare ingredients with your pantry and buy the difference.</p></div></li>
          </ol>
        </section>
      </main>
      <footer className="home-footer"><span>tryPan</span><nav aria-label="Legal"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link></nav></footer>
    </>
  );
}

