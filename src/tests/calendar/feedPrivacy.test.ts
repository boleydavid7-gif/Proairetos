import { describe, expect, it } from 'vitest';
import { FEED_NEVER, defaultFeedOptions, describeFeed } from '../../core/calendar/feedEvents';

/* The words the settings page uses for what the calendar file holds. */
describe('the words the settings page uses', () => {
  it('lists exactly the switches that are on, and says what is never in the file', () => {
    expect(describeFeed({ ...defaultFeedOptions })).toEqual(['your commitments, titled “Busy”']);
    expect(describeFeed({ ...defaultFeedOptions, shiftLabels: true })).toEqual(['your commitments, with the names from your schedule']);
    expect(describeFeed({ ...defaultFeedOptions, shifts: false })).toEqual([]);
    const all = describeFeed({ shifts: true, shiftLabels: false, protectedTime: true, tasks: true });
    expect(all).toEqual(['your commitments, titled “Busy”', 'protected time, titled “Protected time”', 'the titles and times of to-dos that have a day or time']);
    expect(FEED_NEVER).toBe('It never holds bill amounts, confirmation codes, addresses, routes or notes.');
  });
  it('the defaults are as they were: commitments on, the rest off', () => {
    expect(defaultFeedOptions).toEqual({ shifts: true, shiftLabels: false, protectedTime: false, tasks: false });
  });
});
