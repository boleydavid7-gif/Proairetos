import { NUTRITION_SOURCE, perServing, type Grade, type Nutrition } from '../core/nutrition';

const GRADES: Grade[] = ['A', 'B', 'C', 'D', 'E'];

/** The grade alone, small: beside a recipe's title and on its card. */
export function NutriBadge({ grade, onClick }: { grade: Grade; onClick?: () => void }) {
  const inner = (
    <>
      <span className="nutri-badge__label">Nutri-Score</span>
      <span className={`nutri-badge__grade nutri--${grade}`}>{grade}</span>
    </>
  );
  return onClick ? (
    <button type="button" className="nutri-badge" aria-label={`Nutri-Score ${grade}`} onClick={onClick}>{inner}</button>
  ) : (
    <span className="nutri-badge" aria-label={`Nutri-Score ${grade}`}>{inner}</span>
  );
}

/** The five letters, the recipe's one raised. */
function Scale({ grade }: { grade: Grade }) {
  return (
    <div className="nutri-scale" role="img" aria-label={`Nutri-Score ${grade}, on a scale from A to E`}>
      {GRADES.map((each) => (
        <span key={each} className={`nutri-scale__letter nutri--${each}${each === grade ? ' is-this' : ''}`}>{each}</span>
      ))}
    </div>
  );
}

const g = (value: number) => `${value} g`;

/** The recipe's Nutri-Score, what is in a serving, and what was read to work it out. */
export function NutritionPanel({ nutrition, servings }: { nutrition: Nutrition; servings?: number }) {
  const facts = perServing(nutrition.total, servings ?? 1);
  const rows: [string, string, boolean?][] = [
    ['Energy', `${facts.kcal} kcal`],
    ['Protein', g(facts.protein)],
    ['Fat', g(facts.fat)],
    ['of which saturates', g(facts.saturated), true],
    ['Carbohydrate', g(facts.carbs)],
    ['of which sugars', g(facts.sugars), true],
    ['Fibre', g(facts.fibre)],
    ['Salt', g(facts.salt)],
  ];
  return (
    <section aria-label="Nutrition" className="nutrition">
      {nutrition.grade ? (
        <div className="card nutrition__score">
          <Scale grade={nutrition.grade} />
          <p className="nutrition__line">A is the healthiest end of the scale, E the least healthy.</p>
        </div>
      ) : (
        <div className="card nutrition__score">
          <p className="nutrition__line">Not enough of the ingredients could be read for a Nutri-Score.</p>
        </div>
      )}
      {nutrition.read.length > 0 && (
        <div className="card">
          <h2 className="card__title card__title--small">{servings ? 'In one serving' : 'In the whole recipe'}</h2>
          <dl className="nutrition__facts">
            {rows.map(([label, value, sub]) => (
              <div key={label} className={sub ? 'is-sub' : undefined}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="fine">Fruit, vegetables, legumes and nuts: {Math.round(nutrition.fvlPercent)}% of the weight.</p>
        </div>
      )}
      <details className="nutrition__how">
        <summary>From {nutrition.read.length} of {nutrition.read.length + nutrition.unread.length} ingredients</summary>
        {nutrition.unread.length > 0 && <p className="fine">Not read: {nutrition.unread.join('; ')}.</p>}
        <p className="fine">Raw weights, before cooking. Herbs, spices and salt to taste are left out. {NUTRITION_SOURCE}</p>
      </details>
    </section>
  );
}
