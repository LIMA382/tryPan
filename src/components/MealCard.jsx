function price(value) {
  return `€${Number(value || 0).toFixed(2)}`;
}

export default function MealCard({ meal, actions, publicView = false }) {
  return (
    <article className={`card meal-card ${meal.is_public ? 'public' : ''}`}>
      <div className="card-header">
        <div>
          <h3>{meal.title}</h3>
          {publicView && <span className="creator-line">by {meal.creator || 'tryPan cook'}</span>}
        </div>

        <span className="price-pill">{price(meal.price)}</span>
      </div>

      <p>{meal.description}</p>

      <div className="badges">
        <span className="badge">{meal.meal_type}</span>
        <span className="badge">{meal.prep_time} min</span>
        {meal.tags?.slice(0, 3).map((tag) => <span className="badge" key={tag}>{tag}</span>)}
      </div>

      <div className="meal-meta-row">
        <span>{meal.ingredients?.length || 0} ingredients</span>
        <span>{meal.servings} servings</span>
      </div>

      {actions && <div style={{ marginTop: 14 }}>{actions}</div>}
    </article>
  );
}
