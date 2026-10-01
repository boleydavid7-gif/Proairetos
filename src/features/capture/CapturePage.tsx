import { useServiceData } from '../../app/hooks/useServiceData';
import { lifeService } from '../../app/services';
import type { LifeItem } from '../../core/life-items/types';
import CaptureBar from '../now/components/CaptureBar';
import { lifeItemTypeLabels, lifeItemTypes } from './labels';

function UnsortedItem({ item }: { item: LifeItem }) {
  return (
    <div className="card stack-tight">
      <p className="card__title">{item.title}</p>
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
    <div className="card stack-tight">
      <div className="card__row">
        <p className="card__title">{item.title}</p>
        <button
          type="button"
          className="icon-toggle"
          aria-pressed={item.important}
          aria-label={item.important ? 'Unmark important' : 'Mark important'}
          onClick={() => lifeService.setImportant(item.id, !item.important)}
        >
          {item.important ? '★' : '☆'}
        </button>
      </div>
      <p className="card__meta">
        {item.type && lifeItemTypeLabels[item.type]}
        {item.status === 'WAITING' && ' · Waiting'}
      </p>
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
      <header className="page-header">
        <h1 className="page-header__title">Capture</h1>
        <p className="page-header__subtitle">Get it out of your head. Sorting can wait.</p>
      </header>

      <CaptureBar />

      {unsorted.length > 0 && (
        <section aria-label="Not sorted yet" className="stack">
          <h2 className="section-label">Not sorted yet</h2>
          {unsorted.map((item) => (
            <UnsortedItem key={item.id} item={item} />
          ))}
        </section>
      )}

      {sorted.length > 0 && (
        <section aria-label="Your life items" className="stack">
          <h2 className="section-label">In your life</h2>
          {sorted.map((item) => (
            <OpenItem key={item.id} item={item} />
          ))}
        </section>
      )}

      {active.length === 0 && <p className="empty-note">Nothing captured yet.</p>}
    </div>
  );
}
