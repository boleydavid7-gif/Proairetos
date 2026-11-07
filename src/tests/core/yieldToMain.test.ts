import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeSlicer, yieldToMain } from '../../core/yieldToMain';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('yieldToMain', () => {
  it('uses scheduler.yield when the browser has it', async () => {
    const run = vi.fn(() => Promise.resolve());
    vi.stubGlobal('scheduler', { yield: run });
    await yieldToMain();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('falls back to a timeout', async () => {
    vi.stubGlobal('scheduler', undefined);
    await expect(yieldToMain()).resolves.toBeUndefined();
  });

  it('only yields once a slice of work has passed', async () => {
    const run = vi.fn(() => Promise.resolve());
    vi.stubGlobal('scheduler', { yield: run });
    vi.useFakeTimers();
    const slice = makeSlicer(24);
    await slice();
    expect(run).not.toHaveBeenCalled();
    vi.setSystemTime(Date.now() + 30);
    await slice();
    expect(run).toHaveBeenCalledTimes(1);
  });
});
