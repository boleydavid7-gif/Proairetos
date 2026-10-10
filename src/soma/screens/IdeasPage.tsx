import { useEffect, useState } from 'react';
import type { Nav } from '../app/App';
import { SearchIcon } from '../app/icons';
import { Brand } from '../app/ui';
import { ask, draftFrom, type Found } from '../app/mealdb';

const shelves = ['Vegetarian', 'Vegan', 'Seafood', 'Chicken', 'Breakfast', 'Pasta', 'Side', 'Starter'];

export default function IdeasPage({ nav }: { nav: Nav }) {
  const [shelf, setShelf] = useState<string | undefined>('Vegetarian');
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<Found[]>();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();

  const load = async (path: string) => {
    setBusy(true);
    setProblem(undefined);
    try {
      const { meals } = await ask<{ meals: Found[] | null }>(path);
      setFound(meals ?? []);
    } catch {
      setProblem('Ideas need a connection. Your own recipes work without one.');
      setFound(undefined);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (shelf) void load(`filter.php?c=${encodeURIComponent(shelf)}`);
  }, [shelf]);

  const open = async (meal: Found) => {
    setBusy(true);
    try {
      await draftFrom(meal);
      nav.go({ name: 'edit' });
    } catch {
      setProblem('That recipe could not be opened just now.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <Brand />
      <h1 className="title">Ideas</h1>
      <form
        className="soma-search"
        onSubmit={(event) => {
          event.preventDefault();
          const words = query.trim();
          if (!words) return;
          setShelf(undefined);
          // A single word is looked up as an ingredient too ("spinach").
          void load(`search.php?s=${encodeURIComponent(words)}`).then(async () => {
            if (!words.includes(' ')) {
              const { meals } = await ask<{ meals: Found[] | null }>(`filter.php?i=${encodeURIComponent(words.replace(/\s+/g, '_'))}`).catch(() => ({ meals: null }));
              if (meals?.length) setFound((before) => [...(before ?? []), ...meals.filter((meal) => !(before ?? []).some((each) => each.idMeal === meal.idMeal))]);
            }
          });
        }}
      >
        <SearchIcon size={20} />
        <input aria-label="Search for ideas" placeholder="A dish or an ingredient" value={query} onChange={(event) => setQuery(event.target.value)} />
      </form>
      <div className="chip-row" role="group" aria-label="Kinds">
        {shelves.map((each) => (
          <button key={each} type="button" className="chip" aria-pressed={shelf === each} onClick={() => setShelf(each)}>
            {each}
          </button>
        ))}
      </div>

      {problem && <p className="muted">{problem}</p>}
      {busy && !found && <p className="muted">Looking…</p>}
      {found && found.length === 0 && <p className="muted">Nothing found for that.</p>}
      <ul className="recipe-rows">
        {found?.slice(0, 40).map((meal) => (
          <li key={meal.idMeal}>
            <button type="button" className="idea-row" onClick={() => void open(meal)} disabled={busy}>
              <img src={meal.strMealThumb ? `${meal.strMealThumb}/small` : undefined} alt="" />
              <span>
                <span className="recipe-row__title">{meal.strMeal}</span>
                {(meal.strArea || meal.strCategory) && <span className="recipe-row__meta">{[meal.strArea, meal.strCategory].filter(Boolean).join(' · ')}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="hint">From TheMealDB, an open recipe collection.</p>
    </div>
  );
}
