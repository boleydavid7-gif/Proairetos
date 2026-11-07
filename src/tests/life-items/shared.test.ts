import { describe, expect, it } from 'vitest';
import { composeShared } from '../../features/share/shared';

describe('shared into Capture', () => {
  it('puts title, text, and link together without repeating them', () => {
    const p = (q: string) => new URLSearchParams(q);
    expect(composeShared(p('share_title=Recipe&share_text=Lentil%20soup&share_url=https%3A%2F%2Fx.org'))).toBe('Recipe\nLentil soup\nhttps://x.org');
    expect(composeShared(p('share_text=See%20https%3A%2F%2Fx.org&share_url=https%3A%2F%2Fx.org'))).toBe('See https://x.org');
    expect(composeShared(p('share_title=Note&share_text=Note%20and%20more'))).toBe('Note and more');
    expect(composeShared(p(''))).toBeUndefined();
  });
});
