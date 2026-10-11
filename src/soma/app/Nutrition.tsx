import { NUTRITION_SOURCE, perServing, type Grade, type Nutrition } from '../core/nutrition';

const GRADES: Grade[] = ['A', 'B', 'C', 'D', 'E'];
const WORDS: Record<Grade, string> = { A: 'Healthiest', B: 'Healthier', C: 'Middle of the scale', D: 'Less healthy', E: 'Least healthy' };

/** EU reference intakes for an adult (Regulation 1169/2011, Annex XIII); fibre is EFSA's adequate intake. */
const REFERENCE = { kcal: 2000, protein: 50, fat: 70, saturated: 20, carbs: 260, sugars: 90, fibre: 25, salt: 6 };
const REFERENCE_SOURCE = 'Day’s reference: EU reference intakes for an adult (Regulation 1169/2011); fibre, EFSA’s adequate intake of 25 g.';

/** The grade alone, small: beside a recipe's title. */
export function NutriBadge({ grade, onClick }: { grade: Grade; onClick?: () => void }) {
  const inner = (
    <>
      <span className={`nutri-badge__grade nutri--${grade}`}>{grade}</span>
      <span className="nutri-badge__text">
        <span className="nutri-badge__label">Nutri-Score</span>
        <span className="nutri-badge__word">{WORDS[grade]}</span>
      </span>
    </>
  );
  return onClick ? (
    <button type="button" className="nutri-badge" aria-label={`Nutri-Score ${grade}, ${WORDS[grade]}`} onClick={onClick}>{inner}</button>
  ) : (
    <span className="nutri-badge" aria-label={`Nutri-Score ${grade}, ${WORDS[grade]}`}>{inner}</span>
  );
}

const g = (value: number) => (value >= 10 ? `${Math.round(value)} g` : `${value} g`);
const percent = (value: number, of: number) => Math.round((value / of) * 100);

/** The recipe's Nutri-Score, a serving at a glance, each nutrient beside a day's reference, and what was read. */
export function NutritionPanel({ nutrition, servings }: { nutrition: Nutrition; servings?: number }) {
  const facts = perServing(nutrition.total, servings ?? 1);
  // Where the energy comes from: protein and carbohydrate 4 kcal a gram, fat 9.
  const energy = [
    { key: 'protein', name: 'Protein', kcal: facts.protein * 4 },
    { key: 'carbs', name: 'Carbohydrate', kcal: facts.carbs * 4 },
    { key: 'fat', name: 'Fat', kcal: facts.fat * 9 },
  ];
  const energyTotal = energy.reduce((sum, part) => sum + part.kcal, 0) || 1;
  const rows: { name: string; value: number; ref: number; sub?: boolean }[] = [
    { name: 'Protein', value: facts.protein, ref: REFERENCE.protein },
    { name: 'Carbohydrate', value: facts.carbs, ref: REFERENCE.carbs },
    { name: 'of which sugars', value: facts.sugars, ref: REFERENCE.sugars, sub: true },
    { name: 'Fat', value: facts.fat, ref: REFERENCE.fat },
    { name: 'of which saturates', value: facts.saturated, ref: REFERENCE.saturated, sub: true },
    { name: 'Fibre', value: facts.fibre, ref: REFERENCE.fibre },
    { name: 'Salt', value: facts.salt, ref: REFERENCE.salt },
  ];
  const where = servings ? 'One serving' : 'The whole recipe';

  return (
    <section aria-label="Nutrition" className="nutrition">
      {nutrition.grade ? (
        <div className="card nutri-hero">
          <div className="nutri-hero__top">
            <span className={`nutri-hero__grade nutri--${nutrition.grade}`} aria-hidden="true">{nutrition.grade}</span>
            <div>
              <p className="nutri-hero__eyebrow">Nutri-Score</p>
              <p className="nutri-hero__word">{WORDS[nutrition.grade]}</p>
            </div>
          </div>
          <div className="nutri-scale" role="img" aria-label={`Nutri-Score ${nutrition.grade}, on a scale from A, healthiest, to E, least healthy`}>
            {GRADES.map((each) => (
              <span key={each} className={`nutri-scale__letter nutri--${each}${each === nutrition.grade ? ' is-this' : ''}`}>{each}</span>
            ))}
          </div>
          <div className="nutri-scale__ends" aria-hidden="true"><span>Healthiest</span><span>Least healthy</span></div>
        </div>
      ) : (
        <div className="card nutri-hero">
          <p className="nutri-hero__eyebrow">Nutri-Score</p>
          <p className="nutrition__line">Not enough of the ingredients could be read to grade this recipe.</p>
        </div>
      )}

      {nutrition.read.length > 0 && (
        <>
          <div className="card nutri-energy">
            <p className="nutri-hero__eyebrow">{where}</p>
            <p className="nutri-energy__kcal">
              <strong>{facts.kcal}</strong> kcal
              <span className="nutri-energy__share">{percent(facts.kcal, REFERENCE.kcal)}% of a day</span>
            </p>
            <div className="nutri-split" role="img" aria-label={`Energy from ${energy.map((part) => `${part.name.toLowerCase()} ${percent(part.kcal, energyTotal)}%`).join(', ')}`}>
              {energy.map((part) => (
                <span key={part.key} className={`nutri-split__part nutri-split--${part.key}`} style={{ flexGrow: Math.max(part.kcal, 0.001) }} title={`${part.name}: ${percent(part.kcal, energyTotal)}% of the energy`} />
              ))}
            </div>
            <ul className="nutri-split__legend">
              {energy.map((part) => (
                <li key={part.key}>
                  <span className={`nutri-split__dot nutri-split--${part.key}`} aria-hidden="true" />
                  {part.name} <strong>{percent(part.kcal, energyTotal)}%</strong>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <div className="nutri-rows__head">
              <h2 className="card__title card__title--small">Nutrients</h2>
              <span className="nutri-rows__ref">of a day</span>
            </div>
            <ul className="nutri-rows">
              {rows.map((row) => {
                const share = percent(row.value, row.ref);
                return (
                  <li key={row.name} className={row.sub ? 'is-sub' : undefined}>
                    <span className="nutri-rows__name">{row.name}</span>
                    <span className="nutri-rows__value">{g(row.value)}</span>
                    <span className="nutri-rows__share">{share}%</span>
                    <span className="nutri-meter" aria-hidden="true"><span style={{ width: `${Math.min(100, share)}%` }} /></span>
                  </li>
                );
              })}
            </ul>
            <p className="fine">Fruit, vegetables, legumes and nuts: {Math.round(nutrition.fvlPercent)}% of the weight.</p>
          </div>
        </>
      )}

      <details className="card nutrition__how">
        <summary>From {nutrition.read.length} of {nutrition.read.length + nutrition.unread.length} ingredients</summary>
        <ul className="nutri-read">
          {nutrition.read.map((each) => (
            <li key={each.line}><span>{each.line}</span><span className="muted">{each.grams} g</span></li>
          ))}
          {nutrition.unread.map((line) => (
            <li key={line} className="is-unread"><span>{line}</span><span className="muted">Not read</span></li>
          ))}
        </ul>
        <p className="fine">Raw weights, before cooking. Herbs, spices and salt to taste are left out. {NUTRITION_SOURCE} {REFERENCE_SOURCE}</p>
      </details>
    </section>
  );
}
