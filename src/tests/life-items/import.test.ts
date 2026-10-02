import { describe, expect, it } from 'vitest';
import { detectFormat, fromCalendarEvents, fromCsv, fromGoogleTasks, fromText, parseCsv } from '../../core/import/readers';

describe('import', () => {
  it('reads a pasted list, with checkboxes', () => {
    expect(fromText('- [ ] Buy milk\n- [x] Book dentist\n\n3. Call Sam').rows).toEqual([
      { title: 'Buy milk' },
      { title: 'Book dentist', done: true },
      { title: 'Call Sam' },
    ]);
  });

  it('parses quoted CSV fields and semicolons', () => {
    expect(parseCsv('a,"b, c","say ""hi"""\r\n1,2,3\n')).toEqual([['a', 'b, c', 'say "hi"'], ['1', '2', '3']]);
    expect(parseCsv('title;due\nTax;2026-10-05')).toEqual([['title', 'due'], ['Tax', '2026-10-05']]);
  });

  it('reads a Todoist export, tasks only, ISO dates only', () => {
    const csv = 'TYPE,CONTENT,DESCRIPTION,PRIORITY,DATE\nsection,Home,,,\ntask,Fix gutter,Ladder in shed,1,2026-10-05\ntask,Water plants,,4,every day\n';
    const result = fromCsv(csv);
    expect(result.source).toBe('Todoist');
    expect(result.rows).toEqual([{ title: 'Fix gutter', notes: 'Ladder in shed', plannedFor: '2026-10-05' }, { title: 'Water plants' }]);
  });

  it('reads any spreadsheet, using the first column without a header', () => {
    expect(fromCsv('Pay rent,2026-10-01\nCall mum').rows).toEqual([{ title: 'Pay rent' }, { title: 'Call mum' }]);
    expect(fromCsv('Task,Done\nOld thing,yes\nNew thing,').rows).toEqual([{ title: 'Old thing', done: true }, { title: 'New thing' }]);
  });

  it('reads Google Tasks from Takeout', () => {
    const json = { kind: 'tasks#taskLists', items: [{ title: 'My Tasks', items: [
      { title: 'Renew passport', notes: 'Photos first', due: '2026-10-09T00:00:00.000Z', status: 'needsAction' },
      { title: 'Old', status: 'completed' },
      { title: 'Gone', deleted: true },
    ] }] };
    expect(fromGoogleTasks(json)?.rows).toEqual([
      { title: 'Renew passport', notes: 'Photos first', plannedFor: '2026-10-09' },
      { title: 'Old', done: true },
    ]);
    expect(fromGoogleTasks({ hello: 1 })).toBeUndefined();
  });

  it('turns calendar events into timed things and leaves repeats out', () => {
    const at = (h: number) => new Date(Date.UTC(2026, 9, 5, h));
    const result = fromCalendarEvents([
      { key: 'a@x:1', title: 'Dentist', start: at(15), end: at(16), location: 'Main St' },
      { key: 'b@x:1', title: 'Gym', start: at(7), end: at(8) },
      { key: 'b@x:2', title: 'Gym', start: at(7), end: at(8) },
      { key: 'c@x:1', title: 'Holiday', start: at(0), end: at(0), allDay: { from: '2026-10-10', until: '2026-10-11' } },
    ]);
    expect(result.rows).toEqual([
      { title: 'Dentist', location: 'Main St', scheduledAt: at(15).toISOString(), endsAt: at(16).toISOString() },
      { title: 'Holiday', plannedFor: '2026-10-10' },
    ]);
    expect(result.note).toContain('1 repeating event was left out');
  });

  it('detects the format', () => {
    expect(detectFormat('BEGIN:VCALENDAR')).toBe('ics');
    expect(detectFormat('{"items":[]}')).toBe('google');
    expect(detectFormat('a,b', 'export.csv')).toBe('csv');
    expect(detectFormat('Buy milk')).toBe('text');
  });
});
