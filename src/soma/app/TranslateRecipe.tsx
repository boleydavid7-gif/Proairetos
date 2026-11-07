import { useEffect, useState } from 'react';
import type { Recipe } from '../core/recipes';
import { languageName, myLanguage, otherLanguage, translateHere, translateLines } from './translate';

type Translated = { title: string; ingredients: string[]; steps: string[] };

/**
 * "Translate to English" on a recipe in another language (computers with Chrome's built-in translator). The
 * translation is shown first; Keep it replaces the recipe's words, with undo.
 */
export function TranslateRecipe({ recipe, onKeep }: { recipe: Recipe; onKeep: (translated: Translated) => void }) {
  const [source, setSource] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState<Translated>();
  const [problem, setProblem] = useState('');

  useEffect(() => {
    if (!translateHere()) return;
    setSource(undefined);
    setShown(undefined);
    void otherLanguage([recipe.title, ...recipe.ingredients.slice(0, 6), ...recipe.steps.slice(0, 3)].join('\n'))
      .then(setSource)
      .catch(() => undefined);
  }, [recipe.id, recipe.updatedAt]);

  if (!source) return null;
  const target = languageName(myLanguage());

  if (!shown) {
    return (
      <div className="translate-recipe">
        <button
          type="button"
          className="button-quiet"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setProblem('');
            const all = [recipe.title, ...recipe.ingredients, ...recipe.steps];
            void translateLines(all, source)
              .then((lines) =>
                setShown({
                  title: lines[0],
                  ingredients: lines.slice(1, 1 + recipe.ingredients.length),
                  steps: lines.slice(1 + recipe.ingredients.length),
                }),
              )
              .catch(() => setProblem('Couldn’t translate it here.'))
              .finally(() => setBusy(false));
          }}
        >
          {busy ? 'Translating…' : `Translate from ${languageName(source)} to ${target}`}
        </button>
        {problem && <p className="hint" role="alert">{problem}</p>}
      </div>
    );
  }

  return (
    <section className="card translate-recipe" aria-label={`In ${target}`}>
      <p className="label">In {target}</p>
      <h2 className="title">{shown.title}</h2>
      <ul className="translate-recipe__list">
        {shown.ingredients.map((line, i) => <li key={`i${i}`}>{line}</li>)}
      </ul>
      <ol className="translate-recipe__list">
        {shown.steps.map((line, i) => <li key={`s${i}`}>{line}</li>)}
      </ol>
      <div className="chip-row">
        <button type="button" className="button-quiet" onClick={() => setShown(undefined)}>Close</button>
        <button type="button" className="button-main" onClick={() => onKeep(shown)}>Keep it</button>
      </div>
    </section>
  );
}
