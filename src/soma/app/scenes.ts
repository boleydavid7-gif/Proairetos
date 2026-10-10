const files = import.meta.glob<string>('../assets/scenes/*.webp', { eager: true, import: 'default', query: '?url' });

/** The photographs, by name ("sunset-valley"). */
export const scenes: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.split('/').pop()!.replace('.webp', ''), url]),
);

export function scene(name: string): string {
  return scenes[name] ?? scenes['sunset-valley'] ?? '';
}
