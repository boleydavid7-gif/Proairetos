// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

let phase = 'ready';
let link: string | null = null;
vi.mock('../../features/settings/AccountSection', () => ({ useSyncStatus: () => ({ phase }) }));
vi.mock('../../app/sync/syncController', () => ({
  calendarFeedLink: async () => link,
  disableCalendarFeed: async () => undefined,
  enableCalendarFeed: async () => 'https://example.test/functions/v1/calendar-feed?token=new',
  refreshCalendarFeed: async () => undefined,
  renewCalendarFeedLink: async () => 'https://example.test/functions/v1/calendar-feed?token=renewed',
}));
vi.mock('../../app/sync/calendarFile', () => ({ downloadCalendarFile: async () => undefined }));

import CalendarSection from '../../features/settings/CalendarSection';
import { loadCalendarFeed, saveCalendarFeed } from '../../data/storage/preferences';

beforeEach(() => { localStorage.clear(); phase = 'ready'; link = null; });
afterEach(cleanup);

describe('Settings > Calendar', () => {
  it('lists the four switches with their defaults', () => {
    render(<CalendarSection onOpenAccount={() => undefined} />);
    const pressed = (name: string) => screen.getByRole('button', { name }).getAttribute('aria-pressed');
    expect(pressed('Commitments from my schedule')).toBe('true');
    expect(pressed('Use the names from my schedule')).toBe('false');
    expect(pressed('Protected time')).toBe('false');
    expect(pressed('Things with a day or time')).toBe('false');
  });
  it('says exactly what the file holds for the switches that are on, and what it never holds', () => {
    render(<CalendarSection onOpenAccount={() => undefined} />);
    const text = () => document.body.textContent ?? '';
    expect(text()).toContain('It holds your commitments, titled “Busy”.');
    expect(text()).toContain('It never holds bill amounts, confirmation codes, addresses, routes or notes.');
    fireEvent.click(screen.getByRole('button', { name: 'Protected time' }));
    expect(text()).toContain('It holds your commitments, titled “Busy”; protected time, titled “Protected time”.');
    fireEvent.click(screen.getByRole('button', { name: 'Commitments from my schedule' }));
    fireEvent.click(screen.getByRole('button', { name: 'Protected time' }));
    expect(text()).toContain('Nothing above is switched on, so it is empty.');
  });
  it('after a link was ended it says so and offers a new one, and says calendar apps keep what they fetched', () => {
    saveCalendarFeed({ enabled: false, options: loadCalendarFeed().options, linkEnded: true });
    render(<CalendarSection onOpenAccount={() => undefined} />);
    expect(document.body.textContent).toContain('Your calendar link was turned off. Create a new link to subscribe again.');
    expect(document.body.textContent).toContain('remove the old subscription in your calendar app');
    expect(screen.getByRole('button', { name: 'Create link' })).toBeTruthy();
  });
  it('with no ended link, no notice shows', () => {
    render(<CalendarSection onOpenAccount={() => undefined} />);
    expect(document.body.textContent).not.toContain('Your calendar link was turned off');
  });
  it('with a link on, the page says calendar apps keep what they fetched', async () => {
    saveCalendarFeed({ enabled: true, options: loadCalendarFeed().options });
    link = 'https://example.test/functions/v1/calendar-feed?token=abc';
    render(<CalendarSection onOpenAccount={() => undefined} />);
    await waitFor(() => expect(screen.getByLabelText('Calendar link')).toBeTruthy());
    expect(document.body.textContent).toContain('Calendar apps keep what they have already fetched.');
    fireEvent.click(screen.getByRole('button', { name: 'Turn off' }));
    expect(document.body.textContent).toContain('Calendars using it stop updating.');
  });
});
