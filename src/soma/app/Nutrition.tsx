import { useState } from 'react';
import { choiceLine, choiceName, estimateServings, foodFor, gramsOf, NUTRITION_SOURCE, perServing, type Grade, type Nutrition, type ScoreParts } from '../core/nutrition';
import { FOODS } from '../core/nutritionTable';
import { readIngredient } from '../core/ingredients';
import { loadFoodChoices, saveFoodChoices, useFoodChoices } from '../data/foodChoices';

const GRADES: Grade[] = ['A', 'B', 'C', 'D', 'F'];
const WORDS: Record<Grade, string> = { A: 'Healthiest', B: 'Healthier', C: 'Middle of the scale', D: 'Less healthy', F: 'Least healthy' };

/** EU reference intakes for an adult (Regulation 1169/2011, Annex XIII); fiber is EFSA's adequate intake. */
const REFERENCE = { kcal: 2000, protein: 50, fat: 70, saturated: 20, carbs: 260, sugars: 90, fibre: 25, salt: 6 };
const REFERENCE_SOURCE = 'Day’s reference: EU reference intakes for an adult (Regulation 1169/2011); fiber, EFSA’s adequate intake of 25 g.';

/** The points that make up the grade, per 100 g, as Nutri-Score adds them up. */
function ScoreWorking({ parts, points }: { parts: ScoreParts; points: number }) {
  const against: [string, number, number][] = [['Energy', parts.energy, 10], ['Sugars', parts.sugars, 15], ['Saturated fat', parts.saturated, 10], ['Salt', parts.salt, 20]];
  const towards: [string, number, number, boolean][] = [['Protein', parts.protein, 7, parts.proteinCounted], ['Fiber', parts.fibre, 5, true], ['Fruit, vegetables, legumes', parts.fvl, 5, true]];
  return (
    <details className="nutri-working">
      <summary>How it was worked out</summary>
      <ul>
        {against.map(([name, value, most]) => <li key={name}><span>{name}</span><span>+{value} <small>of {most}</small></span></li>)}
        {towards.map(([name, value, most, counted]) => <li key={name}><span>{name}{counted ? '' : ' (not counted)'}</span><span>{counted && value ? `−${value}` : '0'} <small>of {most}</small></span></li>)}
        <li className="nutri-working__total"><span>Score</span><span>{points}</span></li>
      </ul>
      {!parts.proteinCounted && <p className="nutrition__line">With 11 or more points against, protein is not counted.</p>}
      <p className="nutrition__line">A: 0 or less · B: 1 to 2 · C: 3 to 10 · D: 11 to 18 · F: 19 or more</p>
    </details>
  );
}

const label = (key: string) => key.charAt(0).toUpperCase() + key.slice(1);

/** One line Soma could not read: say which food it is (and its weight, if needed), or leave it out. */
function UnreadLine({ line }: { line: string }) {
  const [picking, setPicking] = useState(false);
  const [find, setFind] = useState(() => choiceName(line));
  const [chosen, setChosen] = useState<string>();
  const [grams, setGrams] = useState('');
  const name = choiceName(line);
  const words = find.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = FOODS.filter((food) => words.some((word) => food.key.includes(word) || food.match.test(word))).slice(0, 8);
  const choose = (key: string) => {
    const food = FOODS.find((each) => each.key === key)!;
    const ingredient = readIngredient(line);
    const current = loadFoodChoices();
    if (gramsOf(ingredient, food) !== undefined) {
      saveFoodChoices({ ...current, foods: { ...current.foods, [name]: key } });
      setPicking(false);
    } else setChosen(key);
  };
  const saveWeight = () => {
    const value = Number(grams.replace(',', '.'));
    if (!chosen || !(value > 0)) return;
    const current = loadFoodChoices();
    saveFoodChoices({ ...current, foods: { ...current.foods, [name]: chosen }, grams: { ...current.grams, [choiceLine(line)]: value } });
    setPicking(false);
  };
  const leaveOut = () => {
    const current = loadFoodChoices();
    saveFoodChoices({ ...current, leaveOut: [...new Set([...(current.leaveOut ?? []), name])] });
  };
  return (
    <li className="nutri-unread">
      <span className="nutri-unread__line">{line}</span>
      {!picking ? (
        <span className="nutri-unread__actions">
          <button type="button" className="chip" onClick={() => setPicking(true)}>Read as…</button>
          <button type="button" className="chip" onClick={leaveOut}>Leave out</button>
        </span>
      ) : chosen ? (
        <span className="nutri-unread__pick">
          <label className="field"><span className="field__label">{label(chosen)}: about how many grams?</span>
            <input className="input" inputMode="decimal" value={grams} onChange={(event) => setGrams(event.target.value)} autoFocus />
          </label>
          <span className="nutri-unread__actions">
            <button type="button" className="chip" onClick={saveWeight}>Save</button>
            <button type="button" className="chip" onClick={() => { setChosen(undefined); setPicking(false); }}>Cancel</button>
          </span>
        </span>
      ) : (
        <span className="nutri-unread__pick">
          <input className="input" aria-label={`What is ${line}?`} value={find} onChange={(event) => setFind(event.target.value)} autoFocus />
          <span className="nutri-unread__actions">
            {matches.map((food) => <button key={food.key} type="button" className="chip" onClick={() => choose(food.key)}>{label(food.key)}</button>)}
            {matches.length === 0 && <span className="muted">No food by that name.</span>}
            <button type="button" className="chip" onClick={() => setPicking(false)}>Cancel</button>
          </span>
        </span>
      )}
    </li>
  );
}

/** Lines the person left out of this recipe's numbers, each with a way to count it again. */
function LeftOut({ lines }: { lines: readonly string[] }) {
  const choices = useFoodChoices();
  const out = lines.filter((line) => line.trim() && choices.leaveOut?.includes(choiceName(line)));
  if (!out.length) return null;
  const countAgain = (line: string) => {
    const current = loadFoodChoices();
    saveFoodChoices({ ...current, leaveOut: (current.leaveOut ?? []).filter((each) => each !== choiceName(line)) });
  };
  return (
    <>
      {out.map((line) => (
        <li key={line} className="nutri-unread"><span className="nutri-unread__line muted">{line}</span><span className="nutri-unread__actions"><button type="button" className="chip" onClick={() => countAgain(line)}>Count it</button></span></li>
      ))}
    </>
  );
}

/** Whether a food was chosen by hand for this line, so the list can offer to undo it. */
function chosenFor(line: string, choices: ReturnType<typeof loadFoodChoices>): boolean {
  const name = choiceName(line);
  return Boolean(choices.foods?.[name]) && choices.foods?.[name] !== foodFor(readIngredient(line))?.key;
}

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
export function NutritionPanel({ nutrition, servings: stated, lines = [], onServings }: { nutrition: Nutrition; servings?: number; lines?: readonly string[]; onServings?: (servings: number) => void }) {
  // A recipe that does not say how many it serves gets an estimate, shown as one, and changeable.
  const estimated = stated ? undefined : nutrition.read.length ? estimateServings(nutrition) : undefined;
  const servings = stated ?? estimated;
  const choices = useFoodChoices();
  const forget = (line: string) => {
    const current = loadFoodChoices();
    const foods = { ...current.foods };
    delete foods[choiceName(line)];
    const grams = { ...current.grams };
    delete grams[choiceLine(line)];
    saveFoodChoices({ ...current, foods, grams });
  };
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
    { name: 'Fiber', value: facts.fibre, ref: REFERENCE.fibre },
    { name: 'Salt', value: facts.salt, ref: REFERENCE.salt },
  ];
  const where = servings ? 'One serving' : 'The whole recipe';
  const servingsControl = servings && onServings && (
    <div className="nutri-serves">
      <span>{estimated ? `Serves about ${servings} (estimated)` : `Serves ${servings}`}</span>
      <span className="nutri-serves__step">
        <button type="button" className="chip" aria-label="Fewer servings" disabled={servings <= 1} onClick={() => onServings(servings - 1)}>−</button>
        <button type="button" className="chip" aria-label="More servings" onClick={() => onServings(servings + 1)}>+</button>
        {estimated && <button type="button" className="chip" onClick={() => onServings(servings)}>Keep</button>}
      </span>
    </div>
  );

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
          <div className="nutri-scale" role="img" aria-label={`Nutri-Score ${nutrition.grade}, on a scale from A, healthiest, to F, least healthy`}>
            {GRADES.map((each) => (
              <span key={each} className={`nutri-scale__letter nutri--${each}${each === nutrition.grade ? ' is-this' : ''}`}>{each}</span>
            ))}
          </div>
          <div className="nutri-scale__ends" aria-hidden="true"><span>Healthiest</span><span>Least healthy</span></div>
          {nutrition.parts && <ScoreWorking parts={nutrition.parts} points={nutrition.points ?? 0} />}
        </div>
      ) : (
        <div className="card nutri-hero">
          <p className="nutri-hero__eyebrow">Nutri-Score</p>
          <p className="nutrition__line">{nutrition.unread.length ? 'Not graded: some ingredients were not read. Say what they are, or leave them out.' : 'Not enough of the ingredients could be read to grade this recipe.'}</p>
          {nutrition.unread.length > 0 && <ul className="nutri-unread-list">{nutrition.unread.map((line) => <UnreadLine key={line} line={line} />)}</ul>}
        </div>
      )}

      {nutrition.read.length > 0 && (
        <>
          <div className="card nutri-energy">
            <p className="nutri-hero__eyebrow">{where}</p>
            {servingsControl}
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
            <p className="fine">Fruit, vegetables, legumes: {Math.round(nutrition.fvlPercent)}% of the weight.</p>
          </div>
        </>
      )}

      <details className="card nutrition__how">
        <summary>From {nutrition.read.length} of {nutrition.read.length + nutrition.unread.length} ingredients</summary>
        <ul className="nutri-read">
          {nutrition.read.map((each) => (
            <li key={each.line}>
              <span>{each.line}</span>
              <span className="muted">{each.grams} g{chosenFor(each.line, choices) && <> · {label(each.food)} <button type="button" className="text-link" onClick={() => forget(each.line)}>Undo</button></>}</span>
            </li>
          ))}
        </ul>
        {(nutrition.unread.length > 0 || lines.length > 0) && (
          <ul className="nutri-unread-list">
            {nutrition.grade && nutrition.unread.map((line) => <UnreadLine key={line} line={line} />)}
            <LeftOut lines={lines} />
          </ul>
        )}
        <p className="fine">Raw weights, before cooking. Herbs, spices and salt to taste are left out. {NUTRITION_SOURCE} {REFERENCE_SOURCE}</p>
      </details>
    </section>
  );
}
