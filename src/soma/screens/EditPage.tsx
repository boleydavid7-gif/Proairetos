import { useMemo, useState } from 'react';
import type { Nav } from '../app/App';
import { holdDraft, shrinkPhoto, takeDraft } from '../app/draft';
import { dishScene } from '../app/scenes';
import { newId, useRecipes } from '../app/state';
import { BackLink } from '../app/ui';
import { splitSteps } from '../core/importRecipe';
import { timeOf, type Recipe, type RecipeDraft } from '../core/recipes';
import { putRecipe } from '../data/store';
import { loadSettings as loadOikonomiaSettings } from '../../oikonomia/data/store';

const numberOrUndefined = (text: string) => {
  const n = Number(text);
  return text.trim() && Number.isFinite(n) && n > 0 ? n : undefined;
};

const centsOrUndefined = (text: string) => {
  if (!text.trim()) return undefined;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
};

/** Writing a recipe in, or looking over one brought in before keeping it. */
export default function EditPage({ nav, id }: { nav: Nav; id?: string }) {
  const recipes = useRecipes();
  const existing = id ? recipes?.find((each) => each.id === id) : undefined;
  const draft = useMemo<RecipeDraft | undefined>(() => (id ? undefined : takeDraft()), [id]);
  const start: Partial<Recipe> = existing ?? draft ?? {};
  const estimatedCurrency = start.estimatedCostCurrency ?? loadOikonomiaSettings().currency;
  const [title, setTitle] = useState(start.title ?? '');
  const [source, setSource] = useState(start.source ?? '');
  const [url, setUrl] = useState(start.url ?? '');
  const [image, setImage] = useState(start.image);
  const [servings, setServings] = useState(start.servings ?? '');
  const [cook, setCook] = useState(String(timeOf(start) ?? ''));
  const [estimatedCost, setEstimatedCost] = useState(start.estimatedCostCents === undefined ? '' : (start.estimatedCostCents / 100).toFixed(2));
  const [ingredients, setIngredients] = useState((start.ingredients ?? []).join('\n'));
  const [steps, setSteps] = useState((start.steps ?? []).join('\n\n'));
  const [tags, setTags] = useState((start.tags ?? []).join(', '));
  const [problem, setProblem] = useState<string>();

  if (id && !recipes) return null;

  const save = async () => {
    const now = new Date().toISOString();
    const total = numberOrUndefined(cook);
    const cost = centsOrUndefined(estimatedCost);
    const sameTime = total === timeOf(start);
    const recipe: Recipe = {
      id: existing?.id ?? newId(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      notes: existing?.notes ?? draft?.notes ?? '',
      favorite: existing?.favorite,
      cooked: existing?.cooked,
      cookedFor: existing?.cookedFor,
      marks: existing?.marks,
      planned: existing?.planned,
      estimatedCostCents: cost,
      estimatedCostCurrency: cost === undefined ? undefined : existing?.estimatedCostCurrency ?? loadOikonomiaSettings().currency,
      title: title.trim() || 'A recipe',
      source: source.trim() || undefined,
      url: url.trim() || undefined,
      image,
      servings: servings.trim() || undefined,
      // Prep and cook times from an import stay while the total is unchanged.
      prepMinutes: sameTime ? start.prepMinutes : undefined,
      cookMinutes: sameTime ? start.cookMinutes : undefined,
      totalMinutes: total,
      ingredients: ingredients
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      steps: steps
        .split(/\n\s*\n/)
        .flatMap((block) => (block.trim().startsWith('# ') ? [block.trim()] : splitSteps(block)))
        .filter(Boolean),
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    };
    await putRecipe(recipe);
    if (existing) nav.back();
    else nav.swap({ name: 'recipe', id: recipe.id });
  };

  return (
    <div className="page">
      <BackLink label="Back" onBack={nav.back} />
      <h1 className="title">{existing ? 'Edit recipe' : draft ? 'Look it over' : 'A new recipe'}</h1>

      <label className="field">
        <span className="label">Name</span>
        <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Garlic herb chicken bowl" />
      </label>

      <section className="field">
        <span className="label">Photo</span>
        <div className="photo-pick">
          <img src={image || dishScene(existing?.id ?? 'new')} alt="" />
          <label className="button-quiet">
            {image ? 'Change photo' : 'Add a photo'}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                try {
                  setImage(await shrinkPhoto(file));
                } catch (cause) {
                  setProblem(cause instanceof Error ? cause.message : 'That photo could not be read.');
                }
              }}
            />
          </label>
          {image && (
            <button type="button" className="text-link" onClick={() => setImage(undefined)}>
              Remove
            </button>
          )}
        </div>
      </section>

      <div className="input-pair">
        <label className="field">
          <span className="label">Serves</span>
          <input className="input" value={servings} onChange={(event) => setServings(event.target.value)} placeholder="4" />
        </label>
        <label className="field">
          <span className="label">Minutes, in all</span>
          <input className="input" inputMode="numeric" value={cook} onChange={(event) => setCook(event.target.value)} placeholder="30" />
        </label>
      </div>

      <label className="field">
        <span className="label">Estimated cost <span className="muted">({estimatedCurrency})</span></span>
        <input className="input" type="number" min="0" step="0.01" inputMode="decimal" value={estimatedCost} onChange={(event) => setEstimatedCost(event.target.value)} placeholder="0.00" />
      </label>

      <label className="field">
        <span className="label">Ingredients, one per line</span>
        <textarea
          className="area"
          value={ingredients}
          onChange={(event) => setIngredients(event.target.value)}
          placeholder={'2 cups brown rice\n1 lb chicken breast\n# For the sauce\n2 tbsp olive oil'}
        />
      </label>

      <label className="field">
        <span className="label">Steps, a blank line between each</span>
        <textarea className="area" value={steps} onChange={(event) => setSteps(event.target.value)} placeholder={'Rinse the rice.\n\nSimmer for 20 minutes.'} />
      </label>

      <label className="field">
        <span className="label">Your words for it, with commas</span>
        <input className="input" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="weeknight, for guests" />
      </label>

      <div className="input-pair">
        <label className="field">
          <span className="label">From</span>
          <input className="input" value={source} onChange={(event) => setSource(event.target.value)} placeholder="Grandma, a book" />
        </label>
        <label className="field">
          <span className="label">Link</span>
          <input className="input" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" />
        </label>
      </div>

      {problem && <p className="hint" role="status">{problem}</p>}
      <button type="button" className="button-main" onClick={() => void save()} disabled={!title.trim() && !ingredients.trim()}>
        {existing ? 'Save' : 'Keep this recipe'}
      </button>
      {!existing && draft && (
        <button
          type="button"
          className="button-quiet"
          onClick={() => {
            holdDraft(draft);
            nav.back();
          }}
        >
          Not now
        </button>
      )}
    </div>
  );
}
