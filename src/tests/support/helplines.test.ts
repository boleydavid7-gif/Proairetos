import { describe, expect, it } from 'vitest';
import { helplinesFor } from '../../features/support/helplines';

describe('helplines', () => {
  it('puts the person’s own region first', () => {
    expect(helplinesFor('en-GB')[0].name).toBe('Samaritans');
    expect(helplinesFor('en-AU')[0].name).toBe('Lifeline');
    expect(helplinesFor('fr-CA')[0].place).toBe('Canada');
  });

  it('keeps every line, whatever the language setting', () => {
    expect(helplinesFor('de')).toHaveLength(5);
    expect(helplinesFor('en-US')[0].place).toBe('United States');
  });
});
