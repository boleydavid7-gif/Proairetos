import { useState } from 'react';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { lifeService } from '../../app/services';
import { ChevronRightIcon, StarIcon } from '../../components/icons/Icons';
import PageHeader from '../../components/layout/PageHeader';
import { describeRule } from '../../core/life-items/repeat';
import type { LifeItem } from '../../core/life-items/types';
import { formatDay, formatWhen } from '../items/dateFields';
import CaptureBar from '../now/components/CaptureBar';
import { lifeItemTypeLabels } from './labels';
import UnsortedItem from './UnsortedItem';

const LEAVE_MS = 260;

function itemMeta(item: LifeItem): string {
  const parts = [item.type ? lifeItemTypeLabels[item.type] : 'Unsorted'];
  if (item.repeat) parts.push(describeRule(item.repeat));
  if (item.scheduledAt) parts.push(item.repeat ? `next ${formatWhen(item.scheduledAt)}` : formatWhen(item.scheduledAt));
  if (item.status === 'WAITING') {
    parts.push(item.checkBackAt ? `Waiting · check back ${formatDay(item.checkBackAt)}` : 'Waiting');
  }
  return parts.join(' · ');
}

function OpenItem({ item }: { item: LifeItem }) {
  const { openItem, offerUndo } = useOverlays();
  const [leaving, setLeaving] = useState(false);

  // The card eases away first, so finishing feels like relief rather than a jump.
  function close(status: 'DONE' | 'LET_GO') {
    setLeaving(true);
    window.setTimeout(async () => {
      const change = await lifeService.setStatus(item.id, status);
      const routineNext = status === 'DONE' && item.repeat && change.item.scheduledAt;
      offerUndo(
        routineNext ? `Done. Next: ${formatWhen(routineNext)}` : `${status === 'DONE' ? 'Done' : 'Let go'}: ${item.title}`,
        change.undo,
      );
      setLeaving(false);
    }, LEAVE_MS);
  }

  return (
    <div className={`item-card${leaving ? ' item-card--leaving' : ''}`}>
      <div className="item-card__row">
        <button type="button" className="item-card__open" onClick={() => openItem(item.id)}>
          <span className="item-card__title">{item.title}</span>
          <span className="item-card__meta">{itemMeta(item)}</span>
          {item.nextStep && <span className="item-card__step">Next: {item.nextStep}</span>}
        </button>
        <button
          type="button"
          className="icon-toggle"
          aria-pressed={item.important}
          aria-label={item.important ? 'Unmark important' : 'Mark important'}
          onClick={() => lifeService.setImportant(item.id, !item.important)}
        >
          <StarIcon filled={item.important} size={20} />
        </button>
      </div>
      <div className="chip-row">
        <button type="button" className="chip" disabled={leaving} onClick={() => close('DONE')}>
          Done
        </button>
        <button type="button" className="chip" disabled={leaving} onClick={() => close('LET_GO')}>
          Let go
        </button>
      </div>
    </div>
  );
}

function ClosedItems({ items }: { items: LifeItem[] }) {
  const { openItem } = useOverlays();
  if (items.length === 0) return null;

  return (
    <details className="closed-list">
      <summary>
        Closed recently <span className="closed-list__count">{items.length}</span>
      </summary>
      <div className="stack-tight">
        {items.map((item) => (
          <button key={item.id} type="button" className="closed-list__item" onClick={() => openItem(item.id)}>
            <span>{item.title}</span>
            <span className="closed-list__meta">
              {item.status === 'DONE' ? 'Done' : 'Let go'} · {formatDay(item.updatedAt)}
            </span>
            <ChevronRightIcon size={16} />
          </button>
        ))}
      </div>
    </details>
  );
}

const byCreated = (a: LifeItem, b: LifeItem) => a.createdAt.localeCompare(b.createdAt);
const CLOSED_SHOWN = 20;

export default function CapturePage() {
  const items = useServiceData(lifeService.subscribe, () => lifeService.list()) ?? [];
  const active = items.filter((item) => item.status === 'OPEN' || item.status === 'WAITING').sort(byCreated);
  const unsorted = active.filter((item) => item.type === null);
  const sorted = active.filter((item) => item.type !== null);
  const closed = items
    .filter((item) => item.status === 'DONE' || item.status === 'LET_GO')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, CLOSED_SHOWN);

  return (
    <div className="page">
      <PageHeader title="Capture" subtitle="Get it out of your head. Sorting can wait." settings />
      <CaptureBar />

      {unsorted.length > 0 && (
        <section aria-label="Not sorted yet" className="stack-tight">
          <h2 className="section-label">Not sorted yet</h2>
          {unsorted.map((item) => (
            <UnsortedItem key={item.id} item={item} />
          ))}
        </section>
      )}

      {sorted.length > 0 && (
        <section aria-label="In your life" className="stack-tight">
          <h2 className="section-label">In your life</h2>
          {sorted.map((item) => (
            <OpenItem key={item.id} item={item} />
          ))}
        </section>
      )}

      {active.length === 0 && (
        <div className="empty-state">
          <p className="empty-state__title">{closed.length > 0 ? 'All clear.' : 'Nothing captured yet.'}</p>
          <p className="empty-state__detail">Whatever is on your mind can go here.</p>
        </div>
      )}

      <ClosedItems items={closed} />
    </div>
  );
}
