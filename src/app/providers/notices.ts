import { APPS, type AppManifest } from '../../core/apps/manifest';
import { noticeLines, toNoticeBlocks, type HostContext, type Provider } from '../../core/providers';
import type { Notice, NoticeKind, NoticeSettings } from '../../core/notify/notices';
import { hostContext } from './context';
import { providedNoticeApps } from './noticePath';
import { providerModules } from './registry';

export { providedNoticeApps };

/*
 * Notices through the provider host. The apps that provide `notices` (the manifest says which) are asked for what is due
 * between now and the end of the horizon; everything else is still gathered by `familyNotices` and `upcomingNotices`.
 * Delivery, timing, wording and sync are downstream of the `Notice[]` and do not know which way it was made.
 */

/** The person's own switch for an app's notices: the first of its switches in Settings > Notifications. There is no other. */
export function noticeSwitchOn(app: string, settings: NoticeSettings, manifest: readonly AppManifest[] = APPS): boolean {
  const key = manifest.find((each) => each.id === app)?.notices.switches[0]?.key;
  return key ? Boolean((settings as Record<string, unknown>)[key]) : false;
}

/** The person's schedule and counting calendars, read when a provider asks and cut to start, end, kind and an own shift's name. */
async function blocksBetween(from: Date, until: Date) {
  const [{ scheduleService }, { otherCalendars }] = await Promise.all([import('../services'), import('../calendars/otherCalendars')]);
  return toNoticeBlocks(await scheduleService.occurrencesBetween(from, until), otherCalendars.blocksBetween(from, until));
}

/** The core: the given providers, asked through the host with this context. Kept apart so it can be tried without the device. */
export async function noticesFrom(providers: readonly Provider<'notices'>[], manifest: readonly AppManifest[], ctx: HostContext): Promise<Notice[]> {
  const { notices } = await noticeLines(providers, manifest, ctx);
  // The host has already held `kind` to the app's manifest kinds, which are notice kinds.
  return notices.map(({ ref: _ref, kind, ...notice }) => ({ ...notice, kind: kind as NoticeKind }));
}

export async function providerNotices(now: Date, until: Date, settings: NoticeSettings): Promise<Notice[]> {
  const apps = providedNoticeApps();
  if (apps.length === 0) return [];
  const modules = await Promise.all(apps.map((app) => providerModules[app]?.()));
  const providers = modules.flatMap((module) => module?.providers ?? []).filter((provider): provider is Provider<'notices'> => provider.capability === 'notices');
  const ctx: HostContext = { ...hostContext(now), range: { from: now, until }, blocks: blocksBetween, noticeSwitch: (app) => noticeSwitchOn(app, settings) };
  return noticesFrom(providers, APPS, ctx);
}
