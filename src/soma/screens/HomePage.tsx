import { useState } from 'react';
import type { Nav } from '../app/App';
import { BasketIcon, BookIcon, LinkIcon, PlusIcon, SearchIcon } from '../app/icons';
import { dishScene, scene } from '../app/scenes';
import { useRecipes, useSettings, useToday } from '../app/state';
import { Brand, greeting, Hero } from '../app/ui';
import { lineFor } from '../core/lines';
import { minutesLabel, timeOf, withWhatIHave, type Recipe } from '../core/recipes';

export function RecipeCard({ recipe, nav }: { recipe: Recipe; nav: Nav }) {
  const time = minutesLabel(timeOf(recipe));
  return (
    <button type="button" className="recipe-card" onClick={() => nav.go({ name: 'recipe', id: recipe.id })}>
      <img className="recipe-card__image" src={recipe.image || dishScene(recipe.id)} alt="" />
      <span className="recipe-card__title">{recipe.title}</span>
      <span className="recipe-card__meta">{[time, recipe.tags[0]].filter(Boolean).join(' · ')}</span>
    </button>
  );
}

export default function HomePage({ nav }: { nav: Nav }) {
  const recipes = useRecipes() ?? [];
  const settings = useSettings();
  const today = useToday();
  const line = lineFor(today);
  const [query, setQuery] = useState('');
  const [have, setHave] = useState('');
  const hits = withWhatIHave(recipes, have).slice(0, 5);
  const favourites = recipes.filter((recipe) => recipe.favorite);

  return (
    <div className="home">
      <Hero image={scene('lake-produce')} tall>
        <Brand light />
        <div className="home__words">
          <p className="home__greeting">{greeting()}</p>
          <h1 className="home__title">Simple food, with care.</h1>
          <p className="home__sub">Cook what nourishes you.</p>
        </div>
      </Hero>
      <div className="page page--under-hero">
        <form
          className="soma-search"
          onSubmit={(event) => {
            event.preventDefault();
            nav.go({ name: 'recipes', query });
          }}
        >
          <SearchIcon size={20} />
          <input aria-label="Search your recipes" placeholder="Search your recipes" value={query} onChange={(event) => setQuery(event.target.value)} />
        </form>

        <div className="tiles">
          <button type="button" className="tile" onClick={() => nav.go({ name: 'import' })}>
            <LinkIcon size={26} />
            <span className="tile__title">Import</span>
          </button>
          <button type="button" className="tile" onClick={() => nav.go({ name: 'edit' })}>
            <PlusIcon size={26} />
            <span className="tile__title">Add</span>
          </button>
          <button type="button" className="tile" onClick={() => nav.swap({ name: 'recipes' })}>
            <BookIcon size={26} />
            <span className="tile__title">My recipes</span>
          </button>
          <button type="button" className="tile" onClick={() => nav.swap({ name: 'groceries' })}>
            <BasketIcon size={26} />
            <span className="tile__title">Groceries</span>
          </button>
        </div>

        {(favourites.length > 0 || recipes.length > 0) && (
          <>
            <div className="section-head">
              <h2>{favourites.length ? 'Favourites' : 'Recently added'}</h2>
              <button type="button" className="text-link" onClick={() => nav.swap({ name: 'recipes' })}>
                All
              </button>
            </div>
            <div className="recipe-scroll">
              {(favourites.length ? favourites : recipes).slice(0, 8).map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} nav={nav} />
              ))}
            </div>
          </>
        )}

        {recipes.length > 0 && (
          <section className="field">
            <div className="section-head">
              <h2>What can I make with…</h2>
            </div>
            <input className="input" aria-label="What you have" placeholder="eggs, spinach, rice" value={have} onChange={(event) => setHave(event.target.value)} />
            {have.trim() && (
              <ul className="recipe-rows">
                {hits.length === 0 && <li className="muted">None of your recipes use those yet.</li>}
                {hits.map(({ recipe, uses }) => (
                  <li key={recipe.id}>
                    <button type="button" className="recipe-row" onClick={() => nav.go({ name: 'recipe', id: recipe.id })}>
                      <img src={recipe.image || dishScene(recipe.id)} alt="" />
                      <span>
                        <span className="recipe-row__title">{recipe.title}</span>
                        <span className="recipe-row__meta">Uses {uses.join(', ')}</span>
                      </span>
                      <span />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <button type="button" className="card card--link" onClick={() => nav.swap({ name: 'ideas' })}>
          <span className="card__eyebrow">Ideas</span>
          <span className="card__title">Find something new to cook</span>
          <span className="muted">Recipes from TheMealDB, an open recipe collection.</span>
        </button>

        {settings.dailyLine && (
          <blockquote className="daily-line">
            “{line.text}”<cite>{line.source}</cite>
          </blockquote>
        )}
      </div>
    </div>
  );
}
