import { describe, expect, it } from 'vitest';
import { describeValue } from '../../core/values/descriptions';
import { presetValues } from '../../core/values/types';

describe('value descriptions', () => {
  it('describes every starting value', () => {
    for (const name of presetValues) expect(describeValue(name), name).toBeTruthy();
  });

  it('leaves values the person wrote without a line', () => {
    expect(describeValue('Gardening')).toBeUndefined();
  });
});
