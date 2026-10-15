import { useEffect } from 'react';
import { lifeService } from '../services';
import { useOverlays } from '../overlays/OverlayContext';
import { syncStatus } from '../sync/syncController';
import { emptyInbox, inboxHere } from './inbox';

/** Brings in what was captured from a Shortcut, on opening and on coming back into view; one undo for all of it. */
export default function InboxOpener() {
  const { offerUndo } = useOverlays();
  useEffect(() => {
    if (!inboxHere()) return;
    const open = async () => {
      if (document.visibilityState !== 'visible') return;
      const ids: string[] = [];
      const texts = await emptyInbox(async (text) => {
        const [first, ...rest] = text.split('\n');
        const item = await lifeService.add(first.trim() || text.trim(), undefined);
        if (rest.join('\n').trim()) await lifeService.edit(item.id, { notes: rest.join('\n').trim() });
        ids.push(item.id);
      }).catch(() => []);
      if (!texts.length) return;
      offerUndo(texts.length === 1 ? `Captured: ${texts[0].split('\n')[0]}` : `${texts.length} captured from your phone`, async () => {
        for (const id of ids) await lifeService.deleteItem(id);
      });
    };
    void open();
    const stop = syncStatus.subscribe(() => syncStatus.get().phase === 'ready' && void open());
    document.addEventListener('visibilitychange', open);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', open);
    };
  }, []);
  return null;
}
