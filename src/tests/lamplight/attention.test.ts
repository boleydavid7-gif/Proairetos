// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ATTENTION_KEY, attention, onAttention, setAttention } from '../../lamplight/attention';

describe('attention choices', () => {
  beforeEach(() => localStorage.clear());

  it('starts with everything on and the count as a number', () => {
    expect(attention()).toEqual({ bell: 'number', updates: true, light: true });
  });

  it('keeps each choice and tells listeners', () => {
    const heard = vi.fn();
    const stop = onAttention(heard);
    setAttention({ bell: 'dot' });
    setAttention({ updates: false });
    expect(attention()).toEqual({ bell: 'dot', updates: false, light: true });
    expect(heard).toHaveBeenCalledTimes(2);
    stop();
  });

  it('reads an unknown or broken value as the default', () => {
    localStorage.setItem(ATTENTION_KEY, '{"bell":"loud","light":"no"}');
    expect(attention()).toEqual({ bell: 'number', updates: true, light: true });
    localStorage.setItem(ATTENTION_KEY, 'not json');
    expect(attention().bell).toBe('number');
  });
});
