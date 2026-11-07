/*
 * Translating a recipe on the computer itself (Chrome's built-in Translator and Language Detector): nothing is sent
 * anywhere. Offered only where the browser has them and the recipe is in another language than the person's.
 */

type Detector = { detect: (text: string) => Promise<{ detectedLanguage: string; confidence: number }[]> };
type Translator = { translate: (text: string) => Promise<string> };
type Api = {
  LanguageDetector?: { create: () => Promise<Detector> };
  Translator?: {
    availability: (options: { sourceLanguage: string; targetLanguage: string }) => Promise<string>;
    create: (options: { sourceLanguage: string; targetLanguage: string }) => Promise<Translator>;
  };
};

const api = () => globalThis as unknown as Api;

export function translateHere(): boolean {
  return Boolean(api().Translator && api().LanguageDetector);
}

export const myLanguage = () => (typeof navigator === 'undefined' ? 'en' : (navigator.language || 'en').split('-')[0].toLowerCase());

/** The recipe's language when it is clearly another than the person's and the browser can translate it; else undefined. */
export async function otherLanguage(sample: string): Promise<string | undefined> {
  const { LanguageDetector, Translator } = api();
  if (!LanguageDetector || !Translator || sample.trim().length < 20) return undefined;
  const [best] = await (await LanguageDetector.create()).detect(sample);
  const source = best?.detectedLanguage?.split('-')[0];
  if (!source || source === 'und' || best.confidence < 0.6 || source === myLanguage()) return undefined;
  const can = await Translator.availability({ sourceLanguage: source, targetLanguage: myLanguage() });
  return can === 'unavailable' ? undefined : source;
}

/** Each line translated, in order (empty lines kept). */
export async function translateLines(lines: readonly string[], source: string): Promise<string[]> {
  const translator = await api().Translator!.create({ sourceLanguage: source, targetLanguage: myLanguage() });
  const out: string[] = [];
  for (const line of lines) out.push(line.trim() ? await translator.translate(line) : line);
  return out;
}

export const languageName = (code: string) => {
  try {
    return new Intl.DisplayNames([navigator.language || 'en'], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
};
