const files = import.meta.glob<string>('../assets/scenes/*.webp', { eager: true, import: 'default', query: '?url' });

/** The photographs, by name ("sunset-valley"). */
export const scenes: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.split('/').pop()!.replace('.webp', ''), url]),
);

export function scene(name: string): string {
  return scenes[name] ?? scenes['sunset-valley'] ?? '';
}

/** A photo for a recipe without its own: the same one each time for the same recipe. */
const dishes = ['chicken-bowl', 'salmon-pan', 'cutting-board', 'mortar-garlic', 'greens-carrots', 'lake-produce', 'pantry-jars'];
export function dishScene(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return scene(dishes[hash % dishes.length]);
}
