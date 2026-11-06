import { lifeRecordAdapters } from '../../core/life-records';
import type { Provider } from '../../core/providers';
import { subscribe as somaChanged } from '../data/store';
import type { Recipe } from '../core/recipes';

/**
 * Meals cooked for someone, one entry for each recipe and day, as the existing adapter projects them (the recipe's title, who it was cooked
 * for, its notes; tags, ingredients and source only as search terms). Never nutrition, lists, the pantry or steps.
 */
export const somaLibrary: Provider<'library'> = {
  app: 'soma',
  capability: 'library',
  version: 1,
  privacy: 'own-search',
  sources: ['somaRecipes'],
  async read(ctx) {
    return lifeRecordAdapters.soma.toRecords(await ctx.records<Recipe>('somaRecipes'));
  },
  subscribe: (listener) => somaChanged(listener),
};
