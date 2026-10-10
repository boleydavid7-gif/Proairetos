/**
 * A word's meanings, from the Free Dictionary API (dictionaryapi.dev, built from Wiktionary, CC BY-SA). Only
 * the one word is sent, when the person asks; nothing about the book goes with it.
 */
export type Meaning = { word: string; phonetic?: string; senses: { part: string; text: string }[] };

export const LOOKUP_SOURCE = 'Free Dictionary API, from Wiktionary (CC BY-SA)';

/** The word to look up from a selection: one word (or a two-word term), without the punctuation around it. */
export function wordToLookUp(selection: string): string | undefined {
  const words = selection.trim().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '').split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 2) return undefined;
  const word = words.join(' ').toLowerCase();
  return word.length <= 40 ? word : undefined;
}

type Entry = { word?: string; phonetic?: string; phonetics?: { text?: string }[]; meanings?: { partOfSpeech?: string; definitions?: { definition?: string }[] }[] };

/** The first few meanings, plainly; undefined when the answer has none. */
export function readMeaning(answer: unknown, most = 4): Meaning | undefined {
  if (!Array.isArray(answer) || answer.length === 0) return undefined;
  const entries = answer as Entry[];
  const senses: Meaning['senses'] = [];
  for (const entry of entries) {
    for (const meaning of entry.meanings ?? []) {
      for (const definition of meaning.definitions ?? []) {
        if (definition.definition && senses.length < most) senses.push({ part: meaning.partOfSpeech ?? '', text: definition.definition });
      }
    }
  }
  if (senses.length === 0) return undefined;
  const first = entries[0];
  return { word: first.word ?? '', phonetic: first.phonetic ?? first.phonetics?.find((each) => each.text)?.text, senses };
}

export async function lookUp(word: string, fetcher: typeof fetch = fetch): Promise<Meaning | undefined> {
  const response = await fetcher(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error('The dictionary did not answer. Try again in a moment.');
  return readMeaning(await response.json());
}
