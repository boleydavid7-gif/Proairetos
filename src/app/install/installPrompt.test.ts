import { describe, expect, it } from 'vitest';
import { INSTALL_STEPS, deviceKind } from './installPrompt';

describe('deviceKind', () => {
  it('reads the device from the browser', () => {
    expect(deviceKind('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15')).toBe('iphone');
    expect(deviceKind('Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130')).toBe('android');
    expect(deviceKind('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130')).toBe('computer');
  });

  it('counts an iPad that reports itself as a Mac', () => {
    expect(deviceKind('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', true)).toBe('iphone');
  });

  it('has steps for every device', () => {
    for (const device of ['iphone', 'android', 'computer'] as const) expect(INSTALL_STEPS[device].steps.length).toBeGreaterThan(1);
  });
});
