import { useState } from 'react';
import type { Nav } from '../app/App';
import { SearchIcon, BookIcon } from '../app/icons';
import DishImage from '../app/DishImage';
import { useFoodChoices } from '../data/foodChoices';
import { recipeNutrition } from '../core/nutrition';
import { useRecipes, useSettings } from '../app/state';
import { Brand, Segmented } from '../app/ui';
import { minutesLabel, searchRecipes, timeOf, type Recipe } from '../core/recipes';
import { loadSettings, saveSettings } from '../data/store';
import { RecipeCard } from './HomePage';
import Empty from '../../app/family/Empty';

function RecipeRow({ recipe, nav }: { recipe: Recipe; nav: Nav }) {
  const settings = useSettings();
  const choices = useFoodChoices();
  const grade = settings.healthRating ? recipeNutrition(recipe.ingredients, choices).grade : undefined;
  return (
    <button type="button" className="recipe-row" onClick={() => nav.go({ name: 'recipe', id: recipe.id })}>
      <DishImage className="recipe-row__image" recipe={recipe} />
      <span>
        <span className="recipe-row__title">{recipe.title}</span>
        <span className="recipe-row__meta">{[minutesLabel(timeOf(recipe)), recipe.tags[0]].filter(Boolean).join(' · ')}</span>
      </span>
      {grade && <span className={`recipe-row__grade nutri--${grade}`} aria-label={`Nutri-Score ${grade}`}>{grade}</span>}
    </button>
  );
}

export default function RecipesPage({ nav, query: start }: { nav: Nav; query?: string }) {
  const recipes = useRecipes();
  const settings = useSettings();
  const [query, setQuery] = useState(start ?? '');
  const [shelf, setShelf] = useState<string>('All');
  const tags = [...new Set((recipes ?? []).flatMap((recipe) => recipe.tags))].sort((a, b) => a.localeCompare(b));
  const shelves = ['All', ...((recipes ?? []).some((recipe) => recipe.favorite) ? ['Favorites'] : []), ...tags];
  const shown = searchRecipes(recipes ?? [], query).filter((recipe) =>
    shelf === 'All' ? true : shelf === 'Favorites' ? recipe.favorite : recipe.tags.includes(shelf),
  );
  const view = settings.recipeView;
  const changeView = (recipeView: typeof view) => saveSettings({ ...loadSettings(), recipeView });

  return (
    <div className="page">
      <Brand />
      <h1 className="title">My recipes</h1>
      <div className="soma-search">
        <SearchIcon size={20} />
        <input aria-label="Search your recipes" value={query} onChange={(event) => setQuery(event.target.value)} />
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
      <Segmented
        label="Recipe view"
        value={view}
        options={[
          { id: 'cards', label: 'Cards' },
          { id: 'list', label: 'List' },
          { id: 'grid', label: 'Grid' },
        ]}
        onChange={changeView}
        small
      />
      {recipes && recipes.length === 0 ? (
        <Empty icon={<BookIcon size={28} />} title="No recipes yet">
          <div className="button-row">
            <button type="button" className="button-main" onClick={() => nav.go({ name: 'import' })}>
              Import
            </button>
            <button type="button" className="button-quiet" onClick={() => nav.go({ name: 'edit' })}>
              Add
            </button>
          </div>
        </Empty>
      ) : (
        <>
          {shown.length === 0 && recipes && <p className="muted">Nothing matches that.</p>}
          <div className={`recipe-collection recipe-collection--${view}`}>
            {view === 'list' ? (
              <div className="recipe-rows">
                {shown.map((recipe) => <RecipeRow key={recipe.id} recipe={recipe} nav={nav} />)}
              </div>
            ) : (
              <div className={view === 'cards' ? 'recipe-cards' : 'recipe-grid'}>
                {shown.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} nav={nav} />)}
              </div>
            )}
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
