import { describe, expect, it } from 'vitest';
import { comingUp, dateParts, datePartsToText, fromCompass, inTouchNow, initials, matches, newPerson, nextOccurrence, sinceText, touchDate, turningText, whenText, type Person } from './people';
import { peopleNotices, defaultPeopleNotices } from './notices';

const now = new Date('2026-10-10T12:00:00');
const person = (patch: Partial<Person>): Person => ({ ...newPerson(patch.id ?? 'p', patch.name ?? 'Sam', now), ...patch });

describe('dates that come round', () => {
  it('finds the next one, today included', () => {
    expect(nextOccurrence('10-10', '2026-10-10')).toBe('2026-10-10');
    expect(nextOccurrence('1990-03-02', '2026-10-10')).toBe('2027-03-02');
    expect(nextOccurrence('02-29', '2026-10-10')).toBe('2027-02-28');
    expect(nextOccurrence('02-29', '2027-10-10')).toBe('2028-02-29');
  });

  it('lists birthdays and dates coming up, soonest first, with the age when known', () => {
    const people = [
      person({ id: 'a', name: 'Ana', birthday: '1990-10-20' }),
      person({ id: 'b', name: 'Ben', birthday: '10-12', dates: [{ id: 'w', label: 'Wedding', date: '2020-11-01' }] }),
      person({ id: 'c', name: 'Cy', birthday: '01-05' }),
    ];
    const list = comingUp(people, '2026-10-10', 30);
    expect(list.map((entry) => `${entry.person.name} ${entry.label} ${entry.date}`)).toEqual(['Ben Birthday 2026-10-12', 'Ana Birthday 2026-10-20', 'Ben Wedding 2026-11-01']);
    expect(turningText(list[1])).toBe('Turns 36');
    expect(turningText(list[2])).toBe('6 years');
    expect(turningText(list[0])).toBeUndefined();
  });

  it('says when plainly', () => {
    expect(whenText('2026-10-10', '2026-10-10')).toBe('Today');
    expect(whenText('2026-10-11', '2026-10-10')).toBe('Tomorrow');
    expect(whenText('2026-10-14', '2026-10-10')).toBe('In 4 days');
  });

  it('reads the form back and forth', () => {
    expect(datePartsToText({ month: 3, day: 2 })).toBe('03-02');
    expect(datePartsToText({ month: 3, day: 2, year: 1990 })).toBe('1990-03-02');
    expect(datePartsToText({ month: 13, day: 2 })).toBeUndefined();
    expect(dateParts('1990-03-02')).toEqual({ month: 3, day: 2, year: 1990 });
  });
});

describe('keeping in touch', () => {
  it('comes round only for a rhythm the person chose', () => {
    expect(touchDate(person({}), '2026-10-10')).toBeUndefined();
    const rhythm = person({ keepInTouch: 14, lastInTouch: '2026-09-20' });
    expect(touchDate(rhythm, '2026-10-10')).toBe('2026-10-04');
    expect(inTouchNow([rhythm, person({ id: 'x', keepInTouch: 30, lastInTouch: '2026-10-01' })], '2026-10-10').map((p) => p.id)).toEqual(['p']);
  });

  it('states the time as a fact', () => {
    expect(sinceText(undefined, '2026-10-10')).toBe('No time noted yet');
    expect(sinceText('2026-10-10', '2026-10-10')).toBe('In touch today');
    expect(sinceText('2026-09-19', '2026-10-10')).toBe('In touch 3 weeks ago');
    expect(sinceText('2026-06-10', '2026-10-10')).toBe('In touch 4 months ago');
  });
});

describe('notices', () => {
  const people = [person({ id: 'a', name: 'Ana', birthday: '1990-10-20', keepInTouch: 7, lastInTouch: '2026-10-01' })];

  it('says a birthday on the day, or the chosen days before', () => {
    const onDay = peopleNotices(people, { ...defaultPeopleNotices, inTouch: false }, '2026-10-10', 14);
    expect(onDay.map((n) => [n.title, n.body, n.at.getDate(), n.open])).toEqual([['Ana’s birthday', 'Today · Turns 36', 20, 'philia:person:a']]);
    const before = peopleNotices(people, { ...defaultPeopleNotices, inTouch: false, dateLead: 7 }, '2026-10-10', 14);
    expect(before[0].at.getDate()).toBe(13);
    expect(before[0].body).toBe('In 7 days · Turns 36');
  });

  it('offers keep-in-touch once, from today if the day has passed', () => {
    const [notice] = peopleNotices(people, { ...defaultPeopleNotices, dates: false }, '2026-10-10', 14);
    expect(notice.at.getDate()).toBe(10);
    expect(notice.body).toBe('In touch 9 days ago.');
  });
});

describe('the rest', () => {
  it('makes initials', () => {
    expect(initials('Ana María López')).toBe('AL');
    expect(initials('Jo')).toBe('JO');
    expect(initials('  ')).toBe('?');
  });

  it('brings in only Compass people not here yet', () => {
    const here = [person({ id: 'a', name: 'Ana', compassId: 'c1' })];
    expect(fromCompass(here, [{ id: 'c1', body: 'Ana' }, { id: 'c2', body: 'ana' }, { id: 'c3', body: 'Ben' }]).map((c) => c.id)).toEqual(['c3']);
  });

  it('searches every word across what is kept', () => {
    const p = person({ name: 'Ana', gifts: [{ id: 'g', text: 'Pottery class', at: '' }] });
    expect(matches(p, 'ana pottery')).toBe(true);
    expect(matches(p, 'ana books')).toBe(false);
  });
});
