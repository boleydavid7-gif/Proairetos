import { useOverlays } from '../../app/overlays/OverlayContext';
import { useState } from 'react';
import { partSeen, setTodayPartShown, type TodayPart } from '../../data/storage/preferences';

/** Sets a part of Today aside for good, offered once the part has been around a few days. Undo is offered; Settings can bring it back any time. */
export default function NotForMe({ part }: { part: TodayPart }) {
  const { offerUndo } = useOverlays();
  const [offered] = useState(() => partSeen(part));
  if (!offered) return null;
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
