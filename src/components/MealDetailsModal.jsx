'use client';

import { AnimatePresence, motion } from 'framer-motion';

function price(value) {
  return `€${Number(value || 0).toFixed(2)}`;
}

export default function MealDetailsModal({ meal, onClose, actions, guest = false }) {
  return (
    <AnimatePresence>
      {meal ? (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.article
            className="meal-modal"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22 }}
          >
            <button className="modal-close" onClick={onClose} aria-label="Close">×</button>

            <div className="meal-modal-header">
              <div>
                <span className="eyebrow">{meal.meal_type || 'Meal'}</span>
                <h2>{meal.title}</h2>
                {meal.creator && <p>Shared by {meal.creator}</p>}
              </div>
              <div className="meal-modal-price">{price(meal.price)}</div>
            </div>

            {guest && (
              <div className="notice subtle-notice">
                You can browse public meals without an account. Log in when you want to save or plan one.
              </div>
            )}

            {meal.description && <p className="meal-modal-description">{meal.description}</p>}

            <div className="meal-modal-meta">
              <span>{meal.prep_time || 0} min</span>
              <span>{meal.servings || 1} servings</span>
              <span>{meal.ingredients?.length || 0} ingredients</span>
            </div>

            <div className="badges modal-tags">
              {(meal.tags || []).map((tag) => <span className="badge" key={tag}>{tag}</span>)}
            </div>

            <section className="meal-modal-section">
              <h3>Ingredients</h3>
              <div className="modal-ingredient-list">
                {(meal.ingredients || []).map((item, index) => (
                  <div key={`${item.name}-${index}`}>
                    <span>{item.name}</span>
                    <strong>{item.quantity} {item.unit}</strong>
                  </div>
                ))}
                {!meal.ingredients?.length && <p>No ingredients listed.</p>}
              </div>
            </section>

            {(meal.instructions || meal.video_url) && (
              <section className="meal-modal-section">
                <h3>Recipe notes</h3>
                {meal.instructions && <p className="modal-instructions">{meal.instructions}</p>}
                {meal.video_url && <a className="video-link" href={meal.video_url} target="_blank" rel="noreferrer">Open recipe video</a>}
              </section>
            )}

            {actions && <div className="meal-modal-actions">{actions}</div>}
          </motion.article>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
