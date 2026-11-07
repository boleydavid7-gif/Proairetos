import { entriesFromStrava, nextAfter, activityFor } from '../../askesis/core/strava';
import { handleStravaRequest, trimActivity } from '../../../worker/strava';
import { resetRateLimit } from '../../../worker/safeFetch';
import type { LogEntry } from '../../askesis/core/log';

const run = (over: Partial<Parameters<typeof entriesFromStrava>[0][number]> = {}) => ({ id: 1, type: 'Run', start: '2026-10-13T06:30:00Z', seconds: 1800, meters: 5000, avgHr: 151.4, name: 'Morning Run', ...over });

describe('Strava in Askesis', () => {
  it('turns activities into log entries, in Askesis words', () => {
    const [entry] = entriesFromStrava([run()], [], () => undefined, new Date('2026-10-14T00:00:00Z'));
    expect(entry).toMatchObject({ id: 'strava-1', date: '2026-10-13', activity: 'run', seconds: 1800, meters: 5000, avgHr: 151, stravaId: 1 });
    // A default name says only the time of day; an own name becomes the note.
    expect(entry.notes).toBeUndefined();
    expect(entriesFromStrava([run({ name: 'River loop' })], [], () => undefined)[0].notes).toBe('River loop');
    expect([activityFor('TrailRun'), activityFor('Walk'), activityFor('Hike'), activityFor('EBikeRide'), activityFor('Yoga')]).toEqual(['run', 'walk', 'hike', 'bike', 'other']);
  });

  it('never brings in the same workout twice, nor one already logged from a watch file', () => {
    const logged: LogEntry[] = [
      { id: 'a', date: '2026-10-13', activity: 'run', meters: 5040, createdAt: '' },
      { id: 'b', date: '2026-10-12', activity: 'walk', stravaId: 2, createdAt: '' },
    ];
    const added = entriesFromStrava([run(), run({ id: 2, type: 'Walk', start: '2026-10-12T18:00:00Z' }), run({ id: 3, start: '2026-10-14T07:00:00Z' })], logged, () => undefined);
    expect(added.map((entry) => entry.stravaId)).toEqual([3]);
  });

  it('counts a run as the open session on its day, once', () => {
    const session = (date: string) => (date === '2026-10-14' ? { id: 'w3', title: 'Easy run' } : undefined);
    const added = entriesFromStrava([run({ id: 4, start: '2026-10-14T06:00:00Z', meters: 3000 }), run({ id: 5, start: '2026-10-14T18:00:00Z', meters: 8000 }), run({ id: 6, type: 'Ride', start: '2026-10-14T12:00:00Z' })], [], session);
    expect(added.map((entry) => entry.workoutId)).toEqual(['w3', undefined, undefined]);
    expect(added[0].workoutTitle).toBe('Easy run');
  });

  it('asks from the newest start already seen, a day back for late uploads', () => {
    const after = nextAfter(0, [run({ start: '2026-10-14T06:00:00Z' })]);
    expect(after).toBe(Date.parse('2026-10-13T06:00:00Z') / 1000);
    expect(nextAfter(after + 10, [])).toBe(after + 10);
  });
});

describe('the Strava bridge', () => {
  beforeEach(() => resetRateLimit());
  const env = { STRAVA_CLIENT_ID: '123', STRAVA_CLIENT_SECRET: 'shh' };

  it('says whether Strava is set up, with only the public id', async () => {
    expect(await (await handleStravaRequest(new Request('https://proairetos.com/api/strava'), env)).json()).toEqual({ clientId: '123' });
    expect(await (await handleStravaRequest(new Request('https://proairetos.com/api/strava'), {})).json()).toEqual({ clientId: null });
  });

  it('adds the secret to the trade and passes back only the tokens and a name', async () => {
    let sent: URLSearchParams | undefined;
    const fake = (async (_url: string, init: RequestInit) => {
      sent = init.body as URLSearchParams;
      return new Response(JSON.stringify({ access_token: 'A', refresh_token: 'R', expires_at: 99, athlete: { firstname: 'Dee', lastname: 'R', city: 'not passed on' } }));
    }) as unknown as typeof fetch;
    const response = await handleStravaRequest(new Request('https://proairetos.com/api/strava', { method: 'POST', body: JSON.stringify({ code: 'C' }), headers: { origin: 'https://proairetos.com' } }), env, fake);
    expect(await response.json()).toEqual({ access: 'A', refresh: 'R', expiresAt: 99, name: 'Dee R' });
    expect(sent?.get('client_secret')).toBe('shh');
    expect(sent?.get('grant_type')).toBe('authorization_code');
  });

  it('passes activities through with only what Askesis keeps, and refuses other sites', async () => {
    const fake = (async () => new Response(JSON.stringify([{ id: 9, sport_type: 'Run', start_date_local: '2026-10-14T06:00:00Z', moving_time: 1500, distance: 4000, map: { polyline: 'secret route' }, start_latlng: [1, 2] }]))) as unknown as typeof fetch;
    const response = await handleStravaRequest(new Request('https://proairetos.com/api/strava/activities?after=0', { headers: { authorization: 'Bearer T' } }), env, fake);
    expect(await response.json()).toEqual({ activities: [{ id: 9, type: 'Run', start: '2026-10-14T06:00:00Z', seconds: 1500, meters: 4000 }] });
    expect(trimActivity({ id: 'x' })).toBeNull();
    const elsewhere = await handleStravaRequest(new Request('https://proairetos.com/api/strava', { headers: { origin: 'https://elsewhere.example' } }), env);
    expect(elsewhere.status).toBe(403);
  });
});
