import { useEffect, useState } from 'react';
import type { Nav } from '../app/App';
import { SearchIcon } from '../app/icons';
import { Brand } from '../app/ui';
import { mergeIdeas, mealIdeas, openIdea, searchWikibooks, type Idea } from '../app/ideaSources';
import { Waiting } from '../../lamplight/Waiting';

const shelves = ['Vegetarian', 'Vegan', 'Seafood', 'Chicken', 'Breakfast', 'Pasta', 'Side', 'Starter'];

export default function IdeasPage({ nav }: { nav: Nav }) {
  const [shelf, setShelf] = useState<string | undefined>('Vegetarian');
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<Idea[]>();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();

  const load = async (path: string, providerQuery?: string) => {
    setBusy(true);
    setProblem(undefined);
    try {
      const results = await Promise.allSettled([mealIdeas(path), providerQuery ? searchWikibooks(providerQuery) : Promise.resolve([])]);
      const successful = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
      if (!successful.length) throw new Error('Ideas need a connection. Your recipes work offline.');
      setFound(mergeIdeas(...successful));
    } catch {
      setProblem('Ideas need a connection. Your recipes work offline.');
      setFound(undefined);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (shelf) void load(`filter.php?c=${encodeURIComponent(shelf)}`, shelf);
  }, [shelf]);

  const open = async (meal: Idea) => {
    setBusy(true);
    try {
      const destination = await openIdea(meal);
      if (destination === 'edit') nav.go({ name: 'edit' });
    } catch {
      setProblem('Couldn’t open that recipe. Try again.');
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
          setBusy(true);
          setProblem(undefined);
          void Promise.allSettled([
            mealIdeas(`search.php?s=${encodeURIComponent(words)}`),
            searchWikibooks(words),
            !words.includes(' ') ? mealIdeas(`filter.php?i=${encodeURIComponent(words.replace(/\s+/g, '_'))}`) : Promise.resolve([]),
          ]).then((results) => {
            const successful = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
            if (successful.length === 0) setProblem('Ideas need a connection. Your recipes work offline.');
            setFound(mergeIdeas(...successful));
          }).finally(() => setBusy(false));
        }}
      >
        <SearchIcon size={20} />
        <input aria-label="Search for ideas" value={query} onChange={(event) => setQuery(event.target.value)} />
      </form>
      <div className="chip-row" role="group" aria-label="Kinds">
        {shelves.map((each) => (
          <button key={each} type="button" className="chip" aria-pressed={shelf === each} onClick={() => setShelf(each)}>
            {each}
          </button>
        ))}
      </div>

      {problem && <p className="muted">{problem}</p>}
      {busy && !found && <p className="muted"><Waiting>Looking…</Waiting></p>}
      {found && found.length === 0 && <p className="muted">Nothing found for that.</p>}
      <ul className="recipe-rows">
        {found?.slice(0, 40).map((meal) => (
          <li key={meal.idMeal}>
            <button type="button" className="idea-row" onClick={() => void open(meal)} disabled={busy}>
              {meal.strMealThumb ? <img src={meal.sourceId === 'mealdb' ? `${meal.strMealThumb}/small` : meal.strMealThumb} alt="" /> : <span className="idea-row__placeholder" aria-hidden="true">↗</span>}
              <span>
                <span className="recipe-row__title">{meal.strMeal}</span>
                <span className="recipe-row__meta">{[meal.strArea, meal.strCategory, meal.sourceLabel].filter(Boolean).join(' · ')}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="hint">Ideas from TheMealDB and the community Cookbook on Wikibooks. External pages stay with their source.</p>
    </div>
  );
}
