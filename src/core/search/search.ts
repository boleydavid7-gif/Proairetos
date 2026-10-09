/**
 * Finding something the person wrote, on the device. Every word typed must
 * appear somewhere in the thing (in any order, ignoring case and accents).
 * Results come newest first; nothing is ranked by importance.
 */
export type Searchable = {
  id: string;
  kind: 'item' | 'reflection' | 'decision' | 'statement' | 'app';
  title: string;
  /** Other text that can match, each with a short name for where it came from. */
  fields: { name: string; text: string | undefined }[];
  at: string;
  /** For a record kept in another app: where to open it. */
  href?: string;
};

export type SearchHit = Searchable & { snippet?: string };

export const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** About `radius` characters either side of the first word found. */
function snippetAround(text: string, word: string, radius = 50): string {
  const index = normalize(text).indexOf(word);
  if (index < 0) return text.slice(0, radius * 2);
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + word.length + radius);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}

export function search(query: string, things: readonly Searchable[], limit = 50): SearchHit[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const hits: SearchHit[] = [];
  for (const thing of things) {
    const texts = [thing.title, ...thing.fields.map((field) => field.text ?? '')];
    const all = normalize(texts.join('\n'));
    if (!words.every((word) => all.includes(word))) continue;
    // Show where it matched when that is not the title.
    const inTitle = words.every((word) => normalize(thing.title).includes(word));
    const field = inTitle ? undefined : thing.fields.find((f) => f.text && words.some((word) => normalize(f.text!).includes(word)));
    hits.push({ ...thing, ...(field?.text ? { snippet: snippetAround(field.text, words.find((w) => normalize(field.text!).includes(w))!) } : {}) });
  }
  return hits.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
