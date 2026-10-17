import { useMemo, useRef, useState } from 'react';
import { useLaunchedFile } from '../../app/family/launchFiles';
import { Sym } from '../../lamplight/icons';
import { Waiting } from '../../lamplight/Waiting';
import type { Nav } from '../app/App';
import { holdDraft, shrinkPhoto } from '../app/draft';
import { newId, useRecipes } from '../app/state';
import { useUndo } from '../app/ui';
import { alreadyKept, readRecipeFiles, RECIPE_FILES, type Brought } from '../core/fromApps';
import type { Recipe } from '../core/recipes';
import { deleteRecipe, putRecipe } from '../data/store';

/** A photo carried in the file, made small enough to keep; a picture's link when the file had none. */
async function imageFor(brought: Brought): Promise<string | undefined> {
  if (brought.photo) {
    try {
      return await shrinkPhoto(new Blob([brought.photo as BlobPart], { type: 'image/jpeg' }));
    } catch {
      // A photo that does not open is left out; the recipe still comes in.
    }
  }
  return brought.draft.image;
}

const fits = (file: File) => /\.(paprikarecipes?|melarecipes?|crumb)$/i.test(file.name);

/**
 * Recipes from another recipe app's export (Paprika, Mela, Crouton) or recipe files, read on this device. Every
 * recipe found is listed to choose from; ones already here start unchosen. One recipe opens to look over; several
 * come in together, with one undo.
 */
export default function FromAnotherApp({ nav }: { nav: Nav }) {
  const input = useRef<HTMLInputElement>(null);
  const shelf = useRecipes();
  const undo = useUndo();
  const [found, setFound] = useState<{ recipes: Brought[]; unread: string[] }>();
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const [reading, setReading] = useState(false);
  const [adding, setAdding] = useState<number>();
  const [problem, setProblem] = useState('');

  const kept = useMemo(() => new Set((found?.recipes ?? []).flatMap((each, i) => (alreadyKept(each.draft, shelf ?? []) ? [i] : []))), [found, shelf]);

  const read = async (files: File[]) => {
    setProblem('');
    setReading(true);
    try {
      const result = readRecipeFiles(await Promise.all(files.map(async (file) => ({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) }))));
      setFound(result);
      setChosen(new Set(result.recipes.flatMap((each, i) => (alreadyKept(each.draft, shelf ?? []) ? [] : [i]))));
      if (!result.recipes.length) setProblem('No recipes in that file. Export from the other app again, or try another file.');
    } catch {
      setProblem('Couldn’t read that file. Try again.');
    } finally {
      setReading(false);
    }
  };

  useLaunchedFile(fits, (file) => void read([file]));

  const addChosen = async () => {
    const picked = (found?.recipes ?? []).filter((_, i) => chosen.has(i));
    if (picked.length === 1) {
      holdDraft({ ...picked[0].draft, image: await imageFor(picked[0]) });
      nav.swap({ name: 'edit' });
      return;
    }
    const ids: string[] = [];
    setAdding(0);
    // Each a moment older than the one before, so the shelf (newest first) keeps the file's order.
    const start = Date.now();
    for (const [index, brought] of picked.entries()) {
      const at = new Date(start - index).toISOString();
      const { draft } = brought;
      const recipe: Recipe = {
        ...draft,
        id: newId(),
        image: await imageFor(brought),
        notes: draft.notes ?? '',
        tags: draft.tags ?? [],
        createdAt: at,
        updatedAt: at,
      };
      await putRecipe(recipe);
      ids.push(recipe.id);
      setAdding(index + 1);
    }
    setAdding(undefined);
    undo(`${ids.length} recipes added`, () => void Promise.all(ids.map((id) => deleteRecipe(id))));
    nav.swap({ name: 'recipes' });
  };

  const toggle = (i: number) => {
    const next = new Set(chosen);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setChosen(next);
  };

  const apps = [...new Set(found?.recipes.map((each) => each.from))];

  return (
    <div className="from-app">
      <input
        ref={input}
        type="file"
        accept={RECIPE_FILES}
        multiple
        hidden
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          event.target.value = '';
          if (files.length) void read(files);
        }}
      />
      {!found?.recipes.length && (
        <>
          <p className="hint">An export from Paprika, Mela or Crouton, or recipe files (JSON, web pages, text). It’s read on this device.</p>
          <button type="button" className="button-main" disabled={reading} onClick={() => input.current?.click()}>
            {reading ? <Waiting>Reading…</Waiting> : 'Choose a file'}
          </button>
        </>
      )}
      {problem && (
        <p className="hint" role="alert">
          {problem}
        </p>
      )}
      {found && found.recipes.length > 0 && (
        <>
          <p className="hint">
            {found.recipes.length === 1 ? '1 recipe' : `${found.recipes.length} recipes`} from {apps.join(' and ')}
            {kept.size ? `. ${kept.size} already here, not chosen` : ''}
            {found.unread.length ? `. Couldn’t read ${found.unread.join(', ')}` : ''}
          </p>
          {found.recipes.length > 1 && (
            <div className="chip-row">
              <button type="button" className="chip" onClick={() => setChosen(new Set(found.recipes.map((_, i) => i)))}>
                Choose all
              </button>
              <button type="button" className="chip" onClick={() => setChosen(new Set())}>
                Choose none
              </button>
            </div>
          )}
          <ul className="check-list">
            {found.recipes.map((each, i) => (
              <li key={i}>
                <button type="button" className="check-row" aria-pressed={chosen.has(i)} onClick={() => toggle(i)}>
                  <span className="check-row__box">{chosen.has(i) ? <Sym name="check" size={16} /> : null}</span>
                  <span>
                    {each.draft.title}
                    {kept.has(i) && <span className="from-app__kept"> · already here</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="button-row">
            <button type="button" className="button-main" disabled={chosen.size === 0 || adding !== undefined} onClick={() => void addChosen()}>
              {adding !== undefined ? (
                <Waiting>{`Adding… ${adding} of ${chosen.size}`}</Waiting>
              ) : chosen.size === 1 ? (
                'Look it over'
              ) : chosen.size === 0 ? (
                'Add recipes'
              ) : (
                `Add ${chosen.size} recipes`
              )}
            </button>
            <button
              type="button"
              className="button-quiet"
              disabled={adding !== undefined}
              onClick={() => {
                setFound(undefined);
                input.current?.click();
              }}
            >
              Another file
            </button>
          </div>
        </>
      )}
    </div>
  );
}
