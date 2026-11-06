import type { Provider } from '../../core/providers';
import { putRecipe, subscribe as somaChanged } from '../data/store';
import type { Recipe } from '../core/recipes';

/* The recipes planned for today and not yet cooked: their titles. Not ingredients, notes or nutrition (manifest, soma.home). A pull marks one cooked in Soma. */
let seen = new Map<string, Recipe>();

export const somaHome: Provider<'home'> = {
  app: 'soma',
  capability: 'home',
  version: 1,
  privacy: 'own-search',
  sources: ['somaRecipes'],
  async read(ctx) {
    const recipes = await ctx.records<Recipe>('somaRecipes');
    seen = new Map(recipes.map((recipe) => [recipe.id, recipe]));
    return recipes
      .filter((recipe) => recipe.planned?.includes(ctx.today) && !recipe.cooked?.includes(ctx.today))
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((recipe) => ({
        ref: { app: 'soma' as const, kind: 'meal', id: recipe.id },
        group: 'attention' as const,
        title: recipe.title,
        detail: 'Planned for today',
        open: `/soma/?open=${encodeURIComponent(`recipe:${recipe.id}`)}`,
        swipe: { id: `meal:${recipe.id}`, word: 'Cooked', marks: true },
      }));
  },
  act(ref, today) {
    const before = seen.get(ref.id);
    if (!before) return () => undefined;
    void putRecipe({ ...before, cooked: [...(before.cooked ?? []).filter((each) => each !== today), today], updatedAt: new Date().toISOString() });
    return () => void putRecipe(before);
  },
  subscribe: (listener) => somaChanged(listener),
};
