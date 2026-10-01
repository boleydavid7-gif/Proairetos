import { useServiceData } from '../../app/hooks/useServiceData';
import { lifeService } from '../../app/services';
import { StarIcon } from '../../components/icons/Icons';
import PageHeader from '../../components/layout/PageHeader';
import type { LifeItem } from '../../core/life-items/types';
import CaptureBar from '../now/components/CaptureBar';
import { lifeItemTypeLabels, lifeItemTypes } from './labels';

function UnsortedItem({ item }: { item: LifeItem }) {
  return (
    <div className="item-card">
      <p className="item-card__title">{item.title}</p>
      <div className="chip-row" role="group" aria-label={`Sort "${item.title}"`}>
        {lifeItemTypes.map((type) => (
          <button key={type} type="button" className="chip" onClick={() => lifeService.sort(item.id, type)}>
            {lifeItemTypeLabels[type]}
          </button>
        ))}
      </div>
    </div>
  );
}

function OpenItem({ item }: { item: LifeItem }) {
  return (
    <div className="item-card">
      <div className="item-card__row">
        <div>
          <p className="item-card__title">{item.title}</p>
          <p className="item-card__meta">
            {item.type && lifeItemTypeLabels[item.type]}
            {item.status === 'WAITING' && ' · Waiting'}
          </p>
        </div>
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
        <button type="button" className="chip" onClick={() => lifeService.setStatus(item.id, 'DONE')}>
          Done
        </button>
        <button type="button" className="chip" onClick={() => lifeService.setStatus(item.id, 'LET_GO')}>
          Let go
        </button>
      </div>
    </div>
  );
}

const byCreated = (a: LifeItem, b: LifeItem) => a.createdAt.localeCompare(b.createdAt);

export default function CapturePage() {
  const items = useServiceData(lifeService.subscribe, () => lifeService.list()) ?? [];
  const active = items.filter((item) => item.status === 'OPEN' || item.status === 'WAITING').sort(byCreated);
  const unsorted = active.filter((item) => item.type === null);
  const sorted = active.filter((item) => item.type !== null);

  return (
    <div className="page">
      <PageHeader title="Capture" subtitle="Get it out of your head. Sorting can wait." />
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
          <p className="empty-state__title">Nothing captured yet.</p>
          <p className="empty-state__detail">Whatever is on your mind can go here.</p>
        </div>
      )}
    </div>
  );
}
