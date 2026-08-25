import Image from 'next/image';
import Link from 'next/link';
import photoCredits from '@/lib/recipePhotoCredits.json';

export const metadata = {
  title: 'Recipe photo credits',
  description: 'Sources, creators and licenses for real food photography used by tryPan.',
  alternates: { canonical: '/photo-credits' },
};

export default function PhotoCreditsPage() {
  return (
    <main className="photo-credits-page">
      <div className="page-shell">
        <Link className="photo-credits-back" href="/">← Back to tryPan</Link>
        <span className="eyebrow">Real food photography</span>
        <h1>Recipe photo credits</h1>
        <p className="photo-credits-intro">These recipe photos show real meals, not AI-generated food. Each image is reused under the license shown below.</p>
        <div className="photo-credits-grid">
          {photoCredits.map((credit) => (
            <article key={credit.slug} className="photo-credit-card">
              <Image src={credit.image} alt={`${credit.recipe} recipe`} width={600} height={400} sizes="(max-width: 760px) 100vw, 33vw" />
              <div><h2>{credit.recipe}</h2><p>Photo by {credit.creator}</p><p><a href={credit.sourceUrl} target="_blank" rel="noreferrer">View original</a> · <a href={credit.licenseUrl} target="_blank" rel="noreferrer">{credit.license}</a></p></div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
