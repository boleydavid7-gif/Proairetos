import { describe, expect, it } from 'vitest';
import { pathForRoute, routeForPath, routeFromHistoryState } from '../../app/routes/browserRoutes';

describe('browser routes', () => {
  it('maps shareable paths to app screens', () => {
    expect(routeForPath('/capture')).toBe('capture');
    expect(routeForPath('/plan/')).toBe('plan');
    expect(routeForPath('/unknown')).toBe('today');
  });

  it('creates paths and reads only valid route history', () => {
    expect(pathForRoute('reflect')).toBe('/reflect');
    expect(routeFromHistoryState({ proairetosRoute: 'settings' })).toBe('settings');
    expect(routeFromHistoryState({ proairetosRoute: 'secret' })).toBeUndefined();
    expect(routeFromHistoryState(null)).toBeUndefined();
  });
});
