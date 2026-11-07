import { openSettingsAt, takeRequestedView } from '../../features/settings/settingsViews';

describe('settings pages', () => {
  it('opens a folded page where it now lives', () => {
    for (const [asked, shown] of [['lock', 'privacy'], ['delete', 'backup'], ['import', 'backup'], ['offers', 'today'], ['calendar', 'calendars'], ['notifications', 'notifications']] as const) {
      openSettingsAt(asked);
      expect(takeRequestedView()).toBe(shown);
    }
    openSettingsAt('nowhere' as never);
    expect(takeRequestedView()).toBeNull();
  });
});
