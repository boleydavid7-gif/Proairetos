import { useOverlays } from '../../app/overlays/OverlayContext';
import { setTodayPartShown, type TodayPart } from '../../data/storage/preferences';

/** Sets a part of Today aside for good. Undo is offered; Settings can bring it back any time. */
export default function NotForMe({ part }: { part: TodayPart }) {
  const { offerUndo } = useOverlays();
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
