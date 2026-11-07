import { describe, expect, it } from 'vitest';
import { SAMPLE_RATE, windowsOf } from '../../mneme/app/transcribe/audio';
import { placeChunks, segmentAt, titleFrom, transcriptText } from '../../mneme/app/transcribe/segments';

// A tone with one silent stretch at `quietAt` seconds.
function speech(seconds: number, quietAt: number[] = []): Float32Array {
  const samples = new Float32Array(Math.round(seconds * SAMPLE_RATE));
  for (let i = 0; i < samples.length; i += 1) {
    const t = i / SAMPLE_RATE;
    const quiet = quietAt.some((at) => t >= at && t < at + 0.3);
    samples[i] = quiet ? 0 : 0.4 * Math.sin(2 * Math.PI * 220 * t);
  }
  return samples;
}

describe('cutting a recording into pieces', () => {
  it('keeps a short recording whole', () => {
    const windows = windowsOf(speech(12));
    expect(windows).toHaveLength(1);
    expect(windows[0].start).toBe(0);
  });

  it('cuts long ones at the quiet moment between 22 and 30 seconds', () => {
    const windows = windowsOf(speech(70, [26, 52]));
    expect(windows.length).toBe(3);
    expect(windows[1].start).toBeGreaterThan(26);
    expect(windows[1].start).toBeLessThan(26.4);
    const total = windows.reduce((sum, window) => sum + window.samples.length, 0);
    expect(total).toBe(70 * SAMPLE_RATE);
    expect(windows.every((window) => window.samples.length <= 30 * SAMPLE_RATE)).toBe(true);
  });

  it('never leaves a sliver at the end', () => {
    const windows = windowsOf(speech(30.2));
    expect(windows.every((window) => window.samples.length >= SAMPLE_RATE / 2)).toBe(true);
  });
});

describe('what Whisper heard', () => {
  it('places chunks in the recording and drops its noise marks', () => {
    const segments = placeChunks(
      [
        { timestamp: [0, 2.5], text: ' Buy  milk tomorrow.' },
        { timestamp: [3, null], text: ' [BLANK_AUDIO]' },
        { timestamp: [4, null], text: ' And call Sam.' },
      ],
      30,
      6,
    );
    expect(segments).toEqual([
      { start: 30, end: 32.5, text: 'Buy milk tomorrow.' },
      { start: 34, end: 36, text: 'And call Sam.' },
    ]);
  });

  it('makes paragraphs at pauses', () => {
    const text = transcriptText([
      { start: 0, end: 2, text: 'First thought.' },
      { start: 2.2, end: 4, text: 'Still the same one.' },
      { start: 8, end: 10, text: 'A new thought.' },
    ]);
    expect(text).toBe('First thought. Still the same one.\n\nA new thought.');
  });

  it('names a note from its first sentence', () => {
    expect(titleFrom('Ideas for the garden this spring. Then more.')).toBe('Ideas for the garden this spring');
    expect(titleFrom('one two three four five six seven eight nine ten')).toBe('one two three four five six seven eight…');
    expect(titleFrom('')).toBe('');
  });

  it('finds the line playing at a moment', () => {
    const segments = [
      { start: 0, end: 2, text: 'a' },
      { start: 2, end: 5, text: 'b' },
      { start: 6, end: 8, text: 'c' },
    ];
    expect(segmentAt(segments, 0)).toBe(0);
    expect(segmentAt(segments, 3)).toBe(1);
    expect(segmentAt(segments, 5.5)).toBe(1);
    expect(segmentAt(segments, 7)).toBe(2);
  });
});

describe('a stuck loop', () => {
  it('keeps a phrase said three times or more in a row once', async () => {
    const { unloop } = await import('../../mneme/app/transcribe/segments');
    expect(unloop('ask what your country, ask what your country, ask what your country, ask what you can do.')).toBe(
      'ask what your country, ask what you can do.',
    );
    expect(unloop('Very very good.')).toBe('Very very good.');
    expect(unloop('no no no no no')).toBe('no');
  });
});
