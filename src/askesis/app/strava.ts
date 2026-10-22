import { mondayOnOrBefore, toLocalDate } from '../../core/scheduling/dates';
import { runsPlaced } from './fitted';
import { asToday } from '../core/gentler';
import { entriesFromStrava, nextAfter, type StravaActivity } from '../core/strava';
import { weekAt } from '../core/plans';
import { layOut } from '../core/week';
import { listEntries, loadPlan, putEntry, deleteEntry } from '../data/store';
import { pathFor } from './state';
import type { LogEntry } from '../core/log';
import { apiUrl } from '../../app/apiBase';

/*
 * Strava, so runs from any watch arrive without typing: Garmin, Apple Watch, Wear OS, COROS and Polar all send their
 * activities to Strava, and Strava lets a web app read them. The connection (tokens, and where it read up to) is a
 * setting, so it syncs, sealed, with the account; the activities become ordinary log entries.
 */

const KEY = 'askesis:strava';
const PENDING = 'askesisStravaState';
const EVERY_MS = 15 * 60_000;

export type StravaLink = { refresh: string; access?: string; expiresAt?: number; name?: string; after?: number; lastAt?: string };

const listeners = new Set<() => void>();
export function onStravaChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function stravaLink(): StravaLink | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StravaLink) : undefined;
  } catch {
    return undefined;
  }
}

function saveLink(next: StravaLink | undefined) {
  if (next) localStorage.setItem(KEY, JSON.stringify(next));
  else localStorage.removeItem(KEY);
  listeners.forEach((listener) => listener());
}

let setUp: Promise<string | null> | null = null;
/** The site's Strava client id, or null when Strava is not set up on this site. */
export function stravaHere(): Promise<string | null> {
  setUp ??= fetch(apiUrl('/api/strava'))
    .then((response) => (response.ok ? (response.json() as Promise<{ clientId: string | null }>) : { clientId: null }))
    .then((data) => data.clientId ?? null)
    .catch(() => null);
  return setUp;
}

/** Leaves for Strava's page; it comes back to `/askesis/?open=strava`. Call it from a tap. */
export async function connectStrava(): Promise<void> {
  const clientId = await stravaHere();
  if (!clientId) throw new Error('Strava is not set up yet.');
  const state = crypto.randomUUID();
  sessionStorage.setItem(PENDING, state);
  const back = `${location.origin}/askesis/?open=strava`;
  location.assign(
    `https://www.strava.com/oauth/authorize?${new URLSearchParams({ client_id: clientId, redirect_uri: back, response_type: 'code', approval_prompt: 'auto', scope: 'activity:read_all', state })}`,
  );
}

// Strava's answer arrives in the address beside ?open=strava; it is read before the app tidies the address.
let returned: URLSearchParams | null = null;
export function keepStravaReturn(search = location.search): void {
  const params = new URLSearchParams(search);
  if (params.get('open') === 'strava' && (params.has('code') || params.has('error'))) returned = params;
}

class StravaRefused extends Error {}

async function trade(body: { code?: string; refresh?: string }): Promise<{ access: string; refresh?: string; expiresAt?: number; name?: string }> {
  const response = await fetch(apiUrl('/api/strava'), { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
  const data = (await response.json().catch(() => ({}))) as { access?: string; refresh?: string; expiresAt?: number; name?: string; error?: string };
  if (response.status === 401) throw new StravaRefused(data.error ?? 'Strava did not accept this connection. Connect it again.');
  if (!response.ok || !data.access) throw new Error(data.error ?? 'Strava could not be reached. Try again.');
  return { access: data.access, refresh: data.refresh, expiresAt: data.expiresAt, name: data.name };
}

/** Back from Strava: keeps the connection, or says why not. Null when the address carries no answer. */
export async function finishStravaConnect(): Promise<string | null> {
  const params = returned;
  returned = null;
  if (!params) return null;
  const expected = sessionStorage.getItem(PENDING);
  sessionStorage.removeItem(PENDING);
  if (params.get('error')) return 'Connecting was canceled.';
  if (!expected || params.get('state') !== expected) return 'That connection did not finish. Try again.';
  if (!/activity:read/.test(params.get('scope') ?? '')) return 'Strava was connected without your activities. Connect again and leave “View data about your activities” ticked.';
  const tokens = await trade({ code: params.get('code') ?? '' });
  // The first time, the last four weeks come in.
  saveLink({ refresh: tokens.refresh ?? '', access: tokens.access, expiresAt: tokens.expiresAt, name: tokens.name, after: Math.floor(Date.now() / 1000) - 28 * 86_400 });
  return null;
}

export function disconnectStrava(): void {
  saveLink(undefined);
}

async function accessToken(link: StravaLink): Promise<string> {
  if (link.access && link.expiresAt && link.expiresAt * 1000 > Date.now() + 60_000) return link.access;
  const tokens = await trade({ refresh: link.refresh });
  saveLink({ ...link, access: tokens.access, refresh: tokens.refresh ?? link.refresh, expiresAt: tokens.expiresAt });
  return tokens.access;
}

/** The session still open on a date in this week's plan, if any. */
function openSessionOn(entries: readonly LogEntry[], today: string): (date: string) => { id: string; title: string } | undefined {
  const state = loadPlan();
  if (!state) return () => undefined;
  const monday = mondayOnOrBefore(today);
  const week = layOut(weekAt(pathFor(state), state.week), today, state.weekdays, state.moves, entries.filter((entry) => entry.date >= monday), [], runsPlaced(state, today));
  return (date) => {
    const day = week.find((each) => each.date === date && !each.done);
    if (!day) return undefined;
    const workout = asToday(day.workout, state.lighter, today);
    return { id: workout.id, title: workout.title };
  };
}

let running: Promise<LogEntry[]> | null = null;

/**
 * Brings in what is new on Strava. `soon`: only when the last look was over 15 minutes ago (on opening). Returns the
 * entries added, which the caller can take back as one (undo).
 */
export function bringInFromStrava(soon = false): Promise<LogEntry[]> {
  const link = stravaLink();
  if (!link?.refresh) return Promise.resolve([]);
  if (soon && link.lastAt && Date.now() - Date.parse(link.lastAt) < EVERY_MS) return Promise.resolve([]);
  running ??= (async () => {
    try {
      const token = await accessToken(link);
      const response = await fetch(apiUrl(`/api/strava/activities?after=${link.after ?? 0}`), { headers: { authorization: `Bearer ${token}` } });
      if (response.status === 401) throw new StravaRefused('Strava did not accept this connection. Connect it again.');
      if (!response.ok) throw new Error('Strava could not be reached. Try again.');
      const { activities } = (await response.json()) as { activities: StravaActivity[] };
      const log = await listEntries();
      const today = toLocalDate(new Date());
      const added = entriesFromStrava(activities, log, openSessionOn(log, today));
      for (const entry of added) await putEntry(entry);
      saveLink({ ...(stravaLink() ?? link), after: nextAfter(link.after, activities), lastAt: new Date().toISOString() });
      return added;
    } catch (cause) {
      // A refused connection is dropped, so the page offers to connect again.
      if (cause instanceof StravaRefused) saveLink({ ...link, refresh: '' });
      throw cause;
    } finally {
      running = null;
    }
  })();
  return running;
}

/** Takes back what one bring-in added (undo). */
export async function takeBack(entries: readonly LogEntry[]): Promise<void> {
  for (const entry of entries) await deleteEntry(entry.id);
}
