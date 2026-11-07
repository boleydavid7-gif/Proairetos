import { present, type Provider } from '../../core/providers';
import type { Recipe } from '../core/recipes';

type Kept = Pick<Recipe, 'id' | 'title' | 'notes' | 'tags' | 'ingredients' | 'createdAt'>;

/* Recipes: the title, ingredient lines, the person's notes and tags. Not grocery lists or nutrition (manifest, soma.search). */
export const somaSearch: Provider<'search'> = {
  app: 'soma',
  capability: 'search',
  version: 1,
  privacy: 'own-search',
  sources: ['somaRecipes'],
  async read(ctx) {
    return (await ctx.records<Kept>('somaRecipes')).map((recipe) => ({
      ref: { app: 'soma' as const, kind: 'recipe', id: recipe.id },
      title: recipe.title,
      titleField: 'recipe title',
      fields: present({ name: 'ingredients', text: recipe.ingredients.join('\n') }, { name: 'recipe notes', text: recipe.notes }, { name: 'tags', text: recipe.tags.join(' ') }),
      at: recipe.createdAt ?? '',
      label: 'Recipe in Soma',
      open: '/soma/',
    }));
  },
};
