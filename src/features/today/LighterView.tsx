import { useOverlays } from '../../app/overlays/OverlayContext';
import { lifeService } from '../../app/services';
import GentleLine from '../../components/ui/GentleLine';
import type { LifeItem } from '../../core/life-items/types';
import { setLighterToday } from '../../data/storage/preferences';
import CaptureBar from '../now/components/CaptureBar';

const isOpen = (item: LifeItem) => item.status === 'OPEN' || item.status === 'WAITING';

/** The one next thing: the first of today's path, or else something the person marked important. */
export function nextThing(items: LifeItem[], today: string): LifeItem | undefined {
  const picks = items
    .filter((item) => isOpen(item) && item.pickedFor === today)
    .sort((a, b) => (a.pickedAt ?? '').localeCompare(b.pickedAt ?? ''));
  if (picks.length > 0) return picks[0];
  return items.filter((item) => isOpen(item) && item.important).sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
}

/** Today on a hard day: one thing, a pause, and somewhere to put whatever comes up. */
export default function LighterView({ items, today }: { items: LifeItem[]; today: string }) {
  const { offerUndo, startFocus, openPause } = useOverlays();
  const next = nextThing(items, today);

  return (
    <>
      <div className="lighter-note">
        <span>Lighter view</span>
        <button type="button" className="text-link" onClick={() => setLighterToday(false)}>
          Show everything
        </button>
      </div>

      {next ? (
        <section className="lighter-next" aria-label="Next">
          <span className="daily-line__label">Next</span>
          <p className="lighter-next__title">{next.title}</p>
          {next.nextStep && <p className="lighter-next__step">First: {next.nextStep}</p>}
          <div className="chip-row">
            <button
              type="button"
              className="chip chip--accent"
              onClick={async () => {
                const change = await lifeService.setStatus(next.id, 'DONE');
                offerUndo(`Done: ${next.title}`, change.undo);
              }}
            >
              Done
            </button>
            <button type="button" className="chip" onClick={() => startFocus({ id: next.id, title: next.title })}>
              Focus on it
            </button>
          </div>
        </section>
      ) : (
        <section className="lighter-next" aria-label="Next">
          <p className="lighter-next__title">Nothing needs you right now.</p>
          <GentleLine />
        </section>
      )}

      <button type="button" className="chip chip--wide lighter-pause" onClick={openPause}>
        Take a pause
      </button>
      <CaptureBar variant="quiet" />
    </>
  );
}
