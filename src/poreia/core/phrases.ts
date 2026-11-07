/*
 * Phrases for the destination's language, from Wikivoyage's phrasebooks (CC BY-SA): their phrase lines read
 * "; English : ''Local'' (say-it-like-this)". The everyday ones come first, in a fixed order, then the rest of Basics.
 */

export type Phrase = { english: string; local: string; say?: string };

const EVERYDAY = [/^hello\b/i, /^good morning/i, /^goodbye\b/i, /^please\b/i, /^thank you\b/i, /^you'?re welcome/i, /^yes\b/i, /^no\b/i, /^excuse me/i, /^(i'?m )?sorry/i, /^do you speak english/i, /^i don'?t understand/i, /^where is the (toilet|restroom|bathroom)/i, /^how much/i, /^help!?$/i, /^the (check|bill),? please/i, /^water/i];

const clean = (text: string) =>
  text
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, '$1')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/'{2,}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** The phrase lines in a phrasebook's wikitext, everyday ones first, at most `limit`. */
export function readPhrases(wikitext: string, limit = 24): Phrase[] {
  const found: Phrase[] = [];
  for (const line of wikitext.split('\n')) {
    const match = /^;\s*([^:]+?)\s*:\s*(.+)$/.exec(line.trim());
    if (!match) continue;
    const english = clean(match[1]);
    const rest = match[2];
    const say = /\(([^()]+)\)\s*$/.exec(rest)?.[1];
    const local = clean(say ? rest.slice(0, rest.lastIndexOf('(')) : rest);
    if (!english || !local || english.length > 60 || local.length > 80) continue;
    if (found.some((each) => each.english.toLowerCase() === english.toLowerCase())) continue;
    found.push({ english, local, say: say ? clean(say) : undefined });
  }
  const rank = (phrase: Phrase) => {
    const at = EVERYDAY.findIndex((pattern) => pattern.test(phrase.english));
    return at === -1 ? EVERYDAY.length : at;
  };
  return found
    .map((phrase, index) => ({ phrase, index }))
    .sort((a, b) => rank(a.phrase) - rank(b.phrase) || a.index - b.index)
    .slice(0, limit)
    .map((each) => each.phrase);
}
