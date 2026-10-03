import { useState } from 'react';
import type { Nav } from '../app/App';
import { SearchIcon } from '../app/icons';
import { useRecipes } from '../app/state';
import { Brand } from '../app/ui';
import { searchRecipes } from '../core/recipes';
import { RecipeCard } from './HomePage';

export default function RecipesPage({ nav, query: start }: { nav: Nav; query?: string }) {
  const recipes = useRecipes();
  const [query, setQuery] = useState(start ?? '');
  const [shelf, setShelf] = useState<string>('All');
  const tags = [...new Set((recipes ?? []).flatMap((recipe) => recipe.tags))].sort((a, b) => a.localeCompare(b));
  const shelves = ['All', ...((recipes ?? []).some((recipe) => recipe.favorite) ? ['Favourites'] : []), ...tags];
  const shown = searchRecipes(recipes ?? [], query).filter((recipe) =>
    shelf === 'All' ? true : shelf === 'Favourites' ? recipe.favorite : recipe.tags.includes(shelf),
  );

  return (
    <div className="page">
      <Brand />
      <h1 className="title">My recipes</h1>
      <div className="soma-search">
        <SearchIcon size={20} />
        <input aria-label="Search your recipes" placeholder="Search by name or ingredient" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      {shelves.length > 1 && (
        <div className="chip-row" role="group" aria-label="Shelves">
          {shelves.map((each) => (
            <button key={each} type="button" className="chip" aria-pressed={shelf === each} onClick={() => setShelf(each)}>
              {each}
            </button>
          ))}
        </div>
      )}
      {recipes && recipes.length === 0 ? (
        <div className="empty">
          <p className="muted">Nothing here yet. Bring in a recipe from a link, paste one, or write your own.</p>
          <div className="button-row">
            <button type="button" className="button-main" onClick={() => nav.go({ name: 'import' })}>
              Import
            </button>
            <button type="button" className="button-quiet" onClick={() => nav.go({ name: 'edit' })}>
              Add
            </button>
          </div>
        </div>
      ) : (
        <>
          {shown.length === 0 && recipes && <p className="muted">Nothing matches that.</p>}
          <div className="recipe-grid">
            {shown.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} nav={nav} />
            ))}
          </div>
          <div className="button-row" style={{ marginTop: 18 }}>
            <button type="button" className="button-quiet" onClick={() => nav.go({ name: 'import' })}>
              Import
            </button>
            <button type="button" className="button-quiet" onClick={() => nav.go({ name: 'edit' })}>
              Add
            </button>
          </div>
        </>
      )}
    </div>
  );
}
