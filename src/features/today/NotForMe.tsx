import { useOverlays } from '../../app/overlays/OverlayContext';
import { useState, useSyncExternalStore } from 'react';
import {
  partSeen,
  setTodayPartShown,
  showNotForMeSnapshot,
  subscribePreferences,
  type TodayPart,
} from '../../data/storage/preferences';

/** Sets a part of Today aside for good, offered once the part has been around a few days. Undo is offered; Settings can bring it back any time. */
export default function NotForMe({ part }: { part: TodayPart }) {
  const { offerUndo } = useOverlays();
  const enabled = useSyncExternalStore(subscribePreferences, showNotForMeSnapshot, showNotForMeSnapshot);
  const [offered] = useState(() => partSeen(part));
  if (enabled !== 'on' || !offered) return null;
  return (
    <button
      type="button"
      className="not-for-me"
      onClick={() => {
        setTodayPartShown(part, false);
        offerUndo('Set aside. Bring it back in Settings.', async () => setTodayPartShown(part, true));
      }}
    >
      Not for me
    </button>
  );
}
