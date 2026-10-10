import { describe, expect, it } from 'vitest';
import { linkTo } from '../../app/family/opening';

describe('links between the apps', () => {
  it('opens a place in another app', () => {
    expect(linkTo('soma', 'recipe:abc')).toBe('/soma/?open=recipe%3Aabc');
    expect(linkTo('askesis')).toBe('/askesis/');
    expect(linkTo('', 'day:today')).toBe('/?open=day%3Atoday');
  });
});
