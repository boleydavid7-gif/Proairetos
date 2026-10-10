import { Leaf } from './icons';

/** A gentle colour for a recipe without a photo: the same one each time for the same recipe. */
const tints = ['sage', 'olive', 'terracotta', 'wheat', 'plum', 'sea'] as const;
export function tintOf(id: string): (typeof tints)[number] {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return tints[hash % tints.length];
}

/**
 * A recipe's own photo, or, without one, a plain card in its colour with
 * its first letter: never a stand-in picture of some other dish.
 */
export default function DishImage({ recipe, className }: { recipe: { id: string; title: string; image?: string }; className?: string }) {
  if (recipe.image) return <img className={className} src={recipe.image} alt="" />;
  const initial = recipe.title.trim().charAt(0).toUpperCase() || '·';
  return (
    <span className={`dish-card dish-card--${tintOf(recipe.id)}${className ? ` ${className}` : ''}`} aria-hidden="true">
      <span className="dish-card__initial">{initial}</span>
      <span className="dish-card__leaf">
        <Leaf size={18} />
      </span>
    </span>
  );
}
