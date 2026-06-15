'use client';

export default function MealCard({ meal, draggable = false, onDragStart, actions }) {
  return (
    <div className={`card meal-card ${meal.is_public ? 'public' : ''}`} draggable={draggable} onDragStart={onDragStart}>
      <div className="card-header"><h3>{meal.title}</h3><span className={`badge ${meal.is_public ? '' : 'private'}`}>{meal.is_public ? 'Public' : 'Private'}</span></div>
      <p>{meal.description || 'No description yet.'}</p>
      <div className="badges">
        <span className="badge">{meal.meal_type}</span>
        <span className="badge">{meal.prep_time || 20} min</span>
        {(meal.tags || []).slice(0, 3).map(t => <span className="badge" key={t}>{t}</span>)}
      </div>
      <div className="meta">{(meal.ingredients || []).length} ingredients · {meal.servings || 2} servings</div>
      {actions && <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}
