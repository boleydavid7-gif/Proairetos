import { useMemo, useState } from 'react';
import { useFoodChoices } from '../data/foodChoices';
import { recipeNutrition } from '../core/nutrition';
import type { Nav } from '../app/App';
import { LinkIcon, PlusIcon, SearchIcon } from '../app/icons';
import { scene } from '../app/scenes';
import DishImage from '../app/DishImage';
import { useGroceries, useRecipes, useSettings, useToday } from '../app/state';
import { recipesUsing, soonItems, shownUseBy } from '../core/soon';
import { latitude, useBlocks } from '../app/proairetos';
import { dayShape } from '../core/dayShape';
import { inSeason, seasonal as seasonalNow, seasonalRecipes } from '../core/seasons';
import { ProducePicture } from './SeasonPage';
import { plannedOn, weekFrom } from '../core/week';
import { Brand, dayLabel, Hero } from '../app/ui';
import { lineFor } from '../core/lines';
import { minutesLabel, timeOf, type Recipe } from '../core/recipes';

export function RecipeCard({ recipe, nav }: { recipe: Recipe; nav: Nav }) {
  const time = minutesLabel(timeOf(recipe));
  const rated = useSettings().healthRating;
  const choices = useFoodChoices();
  const grade = useMemo(() => (rated ? recipeNutrition(recipe.ingredients, choices).grade : undefined), [rated, recipe.ingredients, choices]);
  return (
    <button type="button" className="recipe-card" onClick={() => nav.go({ name: 'recipe', id: recipe.id })}>
      <DishImage className="recipe-card__image" recipe={recipe} />
      {grade && <span className={`recipe-card__grade nutri--${grade}`} aria-label={`Nutri-Score ${grade}`}>{grade}</span>}
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
  const favorites = recipes.filter((recipe) => recipe.favorite);
  const groceries = useGroceries() ?? [];
  const soon = soonItems(groceries, today);
  const soonRecipes = soon.length ? recipesUsing(recipes, soon) : [];
  const blocks = useBlocks(today);
  const shape = settings.fitsYourDay ? dayShape(blocks, today, new Date()) : undefined;
  const week = weekFrom(today)
    .map((day) => ({ day, meals: plannedOn(recipes, day) }))
    .filter((each) => each.meals.length > 0);
  const produce = settings.seasons ? inSeason(new Date().getMonth(), latitude()) : [];
  const seasonal = seasonalRecipes(recipes, produce);
  const inSeasonNow = settings.seasons ? seasonalNow(new Date().getMonth(), latitude()) : [];
  const listDays = (days: string[]) => days.map((day) => dayLabel(day, today)).join(', ');

  return (
    <div className="home">
      <Hero image={scene('lake-produce')} tall>
        <Brand light />
        <div className="home__words">
          <h1 className="home__title">Recipes</h1>
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

        {recipes.length > 0 && (
          <button type="button" className="card card--link tonight-card" onClick={() => nav.go({ name: 'tonight', time: shape?.busyEvening ? 30 : undefined })}>
            <span className="card__title">What can I make tonight?</span>
            {shape?.today && <span className="muted">{shape.today}</span>}
          </button>
        )}
        {soon.length > 0 && (
          <section className="card use-soon" aria-label="Use soon">
            <span className="card__eyebrow">Use soon</span>
            <p className="use-soon__things">{soon.map((item) => `${item.name} (${(shownUseBy(item.useBy, today) ?? '').replace(/^Use by /, '').replace(/^Use-by was /, 'was ')})`).join(', ')}</p>
            {soonRecipes.map(({ recipe, uses }) => (
              <button key={recipe.id} type="button" className="use-soon__recipe" onClick={() => nav.go({ name: 'recipe', id: recipe.id })}>
                <span>{recipe.title}</span>
                <span className="muted">{uses.join(', ')}</span>
              </button>
            ))}
          </section>
        )}
        {shape && shape.lateDays.length >= 2 && recipes.length > 0 && (
          <button type="button" className="card card--link" onClick={() => nav.go({ name: 'week', mark: recipes.some((recipe) => recipe.marks?.includes('ahead')) ? 'ahead' : undefined })}>
            <span className="card__eyebrow">Late ones {listDays(shape.lateDays)}</span>
            <span className="card__title">Cook once, eat twice?</span>
          </button>
        )}

        <div className="home-actions">
          <button type="button" className="button-quiet" onClick={() => nav.go({ name: 'import' })}>
            <LinkIcon size={20} /> Import
          </button>
          <button type="button" className="button-quiet" onClick={() => nav.go({ name: 'edit' })}>
            <PlusIcon size={20} /> Add
          </button>
        </div>

        {(favorites.length > 0 || recipes.length > 0) && (
          <>
            <div className="section-head">
              <h2>{favorites.length ? 'Favorites' : 'Recently added'}</h2>
              <button type="button" className="text-link" onClick={() => nav.swap({ name: 'recipes' })}>
                All
              </button>
            </div>
            <div className="recipe-scroll">
              {(favorites.length ? favorites : recipes).slice(0, 8).map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} nav={nav} />
              ))}
            </div>
          </>
        )}


        {recipes.length > 0 && (
          <>
            <div className="section-head">
              <h2>This week</h2>
              <button type="button" className="text-link" onClick={() => nav.go({ name: 'week' })}>
                {week.length ? 'Open' : 'Plan a few'}
              </button>
            </div>
            {week.length > 0 && (
              <ul className="week week--small">
                {week.map(({ day, meals }) => (
                  <li key={day} className="week__day">
                    <span className="week__when">{dayLabel(day, today)}</span>
                    <span>
                      {meals.map((meal, i) => (
                        <button key={meal.id} type="button" className="text-link" onClick={() => nav.go({ name: 'recipe', id: meal.id })}>
                          {meal.title}
                          {i < meals.length - 1 ? ',' : ''}
                        </button>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {produce.length > 0 && (
          <button type="button" className="card card--link season-card" onClick={() => nav.go({ name: 'season' })}>
            <span className="card__eyebrow">In season now</span>
            <span className="season-card__pics" aria-hidden="true">
              {inSeasonNow.slice(0, 5).map((item) => (
                <ProducePicture key={item.id} item={item} />
              ))}
            </span>
            <span className="season-card__names">{produce.slice(0, 6).join(', ')}</span>
            {seasonal.length > 0 && <span className="muted">{seasonal.length === 1 ? `Used in your ${seasonal[0].recipe.title.toLowerCase()}` : `Used in ${seasonal.length} of your recipes`}</span>}
          </button>
        )}

        <button type="button" className="card card--link" onClick={() => nav.swap({ name: 'ideas' })}>
          <span className="card__eyebrow">Ideas</span>
          <span className="card__title">Find something new to cook</span>
        </button>

        {settings.dailyLine && recipes.length > 0 && (
          <blockquote className="daily-line">
            “{line.text}”<cite>{line.source}</cite>
          </blockquote>
        )}
      </div>
    </div>
  );
}
