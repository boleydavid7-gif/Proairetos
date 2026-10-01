import { describe, expect, it } from 'vitest';
import { isOldAddress } from '../../app/siteAddress';

describe('site address', () => {
  it('recognises the old workers.dev address only', () => {
    expect(isOldAddress('proairetos.boleydavid7.workers.dev')).toBe(true);
    expect(isOldAddress('proairetos.com')).toBe(false);
    expect(isOldAddress('localhost')).toBe(false);
  });
});
