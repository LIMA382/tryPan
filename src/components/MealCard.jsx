function price(value) {
  return `€${Number(value || 0).toFixed(2)}`;
}

export default function MealCard({ meal, actions, publicView = false, compact = false, onOpen }) {
  return (
    <article
      className={`card meal-card ${meal.is_public ? 'public' : ''} ${compact ? 'compact' : ''} ${onOpen ? 'clickable' : ''}`}
      onClick={onOpen}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={(event) => {
        if (!onOpen) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="card-header">
        <div>
          <h3>{meal.title}</h3>
          {publicView && <span className="creator-line">by {meal.creator || 'tryPan cook'}</span>}
        </div>
        <span className="price-pill">{price(meal.price)}</span>
      </div>

      {meal.description && <p>{compact ? `${meal.description.slice(0, 92)}${meal.description.length > 92 ? '…' : ''}` : meal.description}</p>}

      <div className="badges">
        <span className="badge">{meal.meal_type}</span>
        <span className="badge">{meal.prep_time} min</span>
        {meal.tags?.slice(0, compact ? 2 : 3).map((tag) => <span className="badge" key={tag}>{tag}</span>)}
      </div>

      <div className="meal-meta-row">
        <span>{meal.ingredients?.length || 0} ingredients</span>
        <span>{meal.servings} servings</span>
      </div>

      {!compact && meal.video_url && (
        <a className="video-link" href={meal.video_url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
          Watch recipe video
        </a>
      )}

      {!compact && meal.instructions && (
        <p className="instructions-preview">
          {meal.instructions.length > 125 ? `${meal.instructions.slice(0, 125)}…` : meal.instructions}
        </p>
      )}

      {actions && <div className="meal-actions" onClick={(event) => event.stopPropagation()}>{actions}</div>}
    </article>
  );
}
