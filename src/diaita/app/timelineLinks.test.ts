import { describe, expect, it } from 'vitest';
import { timelineHref } from './timelineLinks';

describe('Diaita timeline destinations', () => {
  it('opens the companion app for the four practical prompts', () => {
    expect(timelineHref({ kind: 'caffeine', key: 'caffeine:2026-11-03' })).toBe('/hydros/');
    expect(timelineHref({ kind: 'worry', key: 'worry:2026-11-03' })).toBe('/capture');
    expect(timelineHref({ kind: 'meal', key: 'meal:2026-11-03' })).toBe('/soma/');
    expect(timelineHref({ kind: 'wind-down', key: 'wind:2026-11-03' })).toBe('/meditate');
  });

  it('leaves ordinary timeline entries and other meal rows non-interactive', () => {
    expect(timelineHref({ kind: 'sleep', key: 'sleep:2026-11-03' })).toBeUndefined();
    expect(timelineHref({ kind: 'work', key: 'work:2026-11-03' })).toBeUndefined();
    expect(timelineHref({ kind: 'meal', key: 'main-meal:2026-11-03' })).toBeUndefined();
  });
});
