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
  it('lists the new categories, all off, and the original four as before', () => {
    render(<CalendarSection onOpenAccount={() => undefined} />);
    const pressed = (name: string) => screen.getByRole('button', { name }).getAttribute('aria-pressed');
    expect(pressed('Commitments from my schedule')).toBe('true');
    expect(pressed('Use the names from my schedule')).toBe('false');
    expect(pressed('Protected time')).toBe('false');
    expect(pressed('Things with a day or time')).toBe('false');
    expect(pressed('Bill names and due dates')).toBe('false');
    expect(pressed('Trips and time off')).toBe('false');
    expect(pressed('Bookings and plans with a time')).toBe('false');
  });
  it('says exactly what the file holds for the switches that are on, and what it never holds', () => {
    render(<CalendarSection onOpenAccount={() => undefined} />);
    const text = () => document.body.textContent ?? '';
    expect(text()).toContain('It holds your commitments, titled “Busy”.');
    expect(text()).toContain('It never holds bill amounts, confirmation codes, addresses, routes or notes.');
    fireEvent.click(screen.getByRole('button', { name: 'Bill names and due dates' }));
    expect(text()).toContain('It holds your commitments, titled “Busy”; bill names and due dates.');
    fireEvent.click(screen.getByRole('button', { name: 'Commitments from my schedule' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bill names and due dates' }));
    expect(text()).toContain('Nothing above is switched on, so it is empty.');
  });
  it('a stored choice from before the new switches keeps its answers and starts them off', () => {
    localStorage.setItem('proairetos.calendarFeed', JSON.stringify({ enabled: true, options: { shifts: false, shiftLabels: false, protectedTime: true, tasks: true } }));
    expect(loadCalendarFeed().options).toEqual({ shifts: false, shiftLabels: false, protectedTime: true, tasks: true, bills: false, trips: false, tripTimes: false });
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

  it('signed out with the link on, says the link is still on and where to turn it off; with it off, says what the link needs', () => {
    phase = 'signed-out';
    saveCalendarFeed({ enabled: true, options: loadCalendarFeed().options });
    const { unmount } = render(<CalendarSection onOpenAccount={() => undefined} />);
    expect(document.body.textContent).toContain('Your calendar link is still on, and anyone who has it can read the file. Sign in to turn it off.');
    expect(screen.getByRole('button', { name: 'Account and sync' })).toBeTruthy();
    unmount();
    saveCalendarFeed({ enabled: false, options: loadCalendarFeed().options });
    render(<CalendarSection onOpenAccount={() => undefined} />);
    expect(document.body.textContent).toContain('The link needs sync turned on.');
    expect(document.body.textContent).not.toContain('still on');
  });
});
