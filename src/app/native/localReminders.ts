import type { Notice } from '../../core/notify/notices';
import { privateNotice } from '../../core/notify/notices';
import { appNameForOpen } from '../../core/notify/sources';
import { nativeId, placeFor } from '../../core/notify/place';

/**
 * Reminders in the phone app: the same notices the web app works out (`app/notify/`), handed to the phone's own
 * notifications so they arrive with the app closed. Only loaded inside the phone app (see `platform.ts`).
 * iPhones keep at most 64 waiting, so the soonest 60 are set; each opening sets them again.
 */
const MOST = 60;
const KEPT = 'proairetosNative.scheduled';

type Plugin = typeof import('@capacitor/local-notifications').LocalNotifications;
let plugin: Promise<Plugin> | undefined;
const load = () => (plugin ??= import('@capacitor/local-notifications').then((module) => module.LocalNotifications));

export type NativePermission = 'granted' | 'denied' | 'default';

const asPermission = (state: string): NativePermission => (state === 'granted' ? 'granted' : state === 'denied' ? 'denied' : 'default');

export async function nativePermission(): Promise<NativePermission> {
  return asPermission((await (await load()).checkPermissions()).display);
}

export async function askNative(): Promise<NativePermission> {
  return asPermission((await (await load()).requestPermissions()).display);
}

/** How a notice reads on the phone: the app's name as the title, then the words, as on the web. */
function asNative(notice: Notice, details: boolean, at: Date) {
  const shown = details ? notice : privateNotice(notice);
  const app = appNameForOpen(shown.open);
  return {
    id: nativeId(notice.key),
    title: app,
    body: shown.title === app ? shown.body : [shown.title, shown.body].filter(Boolean).join(' · '),
    schedule: { at, allowWhileIdle: true },
    extra: { open: notice.open },
  };
}

/** Replaces what this app set before with the soonest of these. */
export async function scheduleNative(notices: readonly Notice[], details: boolean): Promise<void> {
  const notifications = await load();
  let before: number[] = [];
  try {
    before = JSON.parse(localStorage.getItem(KEPT) ?? '[]') as number[];
  } catch {
    before = [];
  }
  if (before.length) await notifications.cancel({ notifications: before.map((id) => ({ id })) }).catch(() => undefined);
  const now = Date.now();
  const soonest = notices.filter((notice) => notice.at.getTime() > now).slice(0, MOST);
  const ids = soonest.map((notice) => nativeId(notice.key));
  if (soonest.length) await notifications.schedule({ notifications: soonest.map((notice) => asNative(notice, details, notice.at)) });
  try {
    localStorage.setItem(KEPT, JSON.stringify(ids));
  } catch {
    // Without storage the next opening cannot cancel these; they are the same times, set again under the same ids.
  }
}

/** One now (a test, a flight's new gate). */
export async function showNativeNow(notice: Notice, details: boolean): Promise<void> {
  await (await load()).schedule({ notifications: [asNative({ ...notice, key: `${notice.key}:now` }, details, new Date(Date.now() + 1000))] });
}

/** A tap opens the page the notice belongs to, as the web's service worker does. */
export async function listenForTaps(): Promise<void> {
  await (await load()).addListener('localNotificationActionPerformed', (action) => {
    const open = (action.notification.extra as { open?: string } | undefined)?.open ?? 'today';
    window.location.href = placeFor(open).url;
  });
}
