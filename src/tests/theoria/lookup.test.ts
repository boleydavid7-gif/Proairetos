import { describe, expect, it } from 'vitest';
import { lookUp, readMeaning, wordToLookUp } from '../../theoria/core/lookup';

describe('looking up a word', () => {
  it('takes one word or a short term from a selection', () => {
    expect(wordToLookUp(' “Prohairesis,” ')).toBe('prohairesis');
    expect(wordToLookUp('ad hominem')).toBe('ad hominem');
    expect(wordToLookUp('three whole words')).toBeUndefined();
    expect(wordToLookUp('…')).toBeUndefined();
  });

  it('reads the first meanings plainly', () => {
    const answer = [{ word: 'equanimity', phonetic: '/ˌɛkwəˈnɪmɪti/', meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'The state of being calm and even-tempered.' }, { definition: 'Composure.' }] }] }];
    expect(readMeaning(answer)).toEqual({ word: 'equanimity', phonetic: '/ˌɛkwəˈnɪmɪti/', senses: [{ part: 'noun', text: 'The state of being calm and even-tempered.' }, { part: 'noun', text: 'Composure.' }] });
    expect(readMeaning({ title: 'No Definitions Found' })).toBeUndefined();
  });

  it('says plainly when there is no entry', async () => {
    const fetcher = (async () => new Response('{}', { status: 404 })) as typeof fetch;
    expect(await lookUp('zzzz', fetcher)).toBeUndefined();
  });
});
