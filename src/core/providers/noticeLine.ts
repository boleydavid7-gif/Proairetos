import type { AppId } from '../apps/manifest';
import type { Notice } from '../notify/notices';
import type { NoticeLine, Provider, ProviderContext } from './types';

/**
 * An app's notice, as the line it puts forward. Its key, kind, time, words and address are the notice's own, unchanged, so
 * the notification's tag and the server row's identity stay what they were; the ref (the notice's key under its kind) is for
 * audit and duplicate checks only.
 */
export const noticeLine = (app: AppId, notice: Notice): NoticeLine => ({
  ref: { app, kind: notice.kind, id: notice.key },
  kind: notice.kind,
  key: notice.key,
  at: notice.at,
  title: notice.title,
  body: notice.body,
  open: notice.open,
});

/** The whole days from now to the end of the range, as the apps' notice functions count their horizon. */
export const daysAhead = (ctx: Pick<ProviderContext, 'now' | 'range'>): number => Math.ceil(((ctx.range?.until ?? ctx.now).getTime() - ctx.now.getTime()) / 86_400_000);

export type NoticeProvider = Provider<'notices'>;
