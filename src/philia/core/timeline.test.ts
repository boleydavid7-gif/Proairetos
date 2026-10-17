import { logContact, newPerson, timeline, timelineText, touchDate, type Person } from './people';
import { philiaYear } from './year';

describe('in touch', () => {
  it('logs a call in one tap, counts the rhythm from it, and keeps a line about it', () => {
    let sam: Person = { ...newPerson('s', 'Sam', new Date('2026-01-01T00:00:00Z')), keepInTouch: 14, lastInTouch: '2026-10-01' };
    sam = logContact(sam, 'call', '2026-10-15', 'c1');
    expect(sam.lastInTouch).toBe('2026-10-15');
    expect(touchDate(sam, '2026-10-15')).toBe('2026-10-29');
    sam = { ...sam, times: sam.times.map((time) => (time.id === 'c1' ? { ...time, text: 'about the move' } : time)) };
    expect(timelineText(timeline(sam)[0])).toBe('Called · about the move');
    // An older contact never moves the last day back.
    expect(logContact(sam, 'message', '2026-09-01', 'm1').lastInTouch).toBe('2026-10-15');
  });

  it('brings times together, contacts and gifts given into one timeline, newest first', () => {
    const ana = {
      ...newPerson('a', 'Ana', new Date()),
      times: [{ id: 't', date: '2026-10-01', text: 'Lunch by the river' }, { id: 'v', date: '2026-10-10', text: '', how: 'visit' as const }],
      gifts: [{ id: 'g', text: 'a scarf', at: '', given: '2026-10-05' }, { id: 'h', text: 'a book', at: '' }],
    };
    expect(timeline(ana).map(timelineText)).toEqual(['Saw them', 'Gave a scarf', 'Lunch by the river']);
    const year = philiaYear([ana, logContact(ana, 'call', '2026-10-12', 'c')], 2026);
    expect(year.facts.find((fact) => fact.label === 'Calls and messages')).toBeTruthy();
  });
});
