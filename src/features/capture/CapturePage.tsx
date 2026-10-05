import { useState } from 'react';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useTodayParts } from '../../app/hooks/useTodayParts';
import { lifeService, reflectionService } from '../../app/services';
import GratitudePage, { GRATITUDE } from './GratitudePage';
import { transition } from '../../app/transitions';
import { ChevronRightIcon, InboxIcon, StarIcon } from '../../components/icons/Icons';
import PageHeader from '../../components/layout/PageHeader';
import type { LifeItem } from '../../core/life-items/types';
import CaptureBar from '../now/components/CaptureBar';
import BrainDumpSheet from './BrainDumpSheet';
import CaptureKindPage, { shelfOf, shelfTitles, type CaptureShelf } from './CaptureKindPage';
import { captureKinds } from './captureKinds';

const newestFirst = (a: LifeItem, b: LifeItem) => b.createdAt.localeCompare(a.createdAt);

/** Under a kind's name: what is there most recently, or its prompt when nothing is. */
function glimpse(items: readonly LifeItem[], prompt: string): string {
  const titles = items.slice(0, 2).map((item) => item.title);
  return titles.length ? `${titles.join(' · ')}${items.length > 2 ? ' …' : ''}` : prompt;
}

/**
 * Capture: a way in for each kind, each opening its own page to add to and
 * look over. Anything typed in the box below, with no kind, waits in Not
 * sorted yet. Sorting is never required.
 */
export default function CapturePage() {
  const items = useServiceData(lifeService.subscribe, () => lifeService.list()) ?? [];
  const [shelf, setShelf] = useState<CaptureShelf | null>(null);
  const [dumping, setDumping] = useState(false);
  const shows = useTodayParts();
  const openOn = (shelfOfItem: CaptureShelf) =>
    items
      .filter(
        (item) =>
          item.source !== 'MANUAL' &&
          (item.status === 'OPEN' || item.status === 'WAITING') &&
          shelfOf(item) === shelfOfItem,
      )
      .sort(newestFirst);
  const unsorted = openOn('UNSORTED');
  const go = (next: CaptureShelf | null) => transition(next ? 'forward' : 'back', () => setShelf(next));
  const [gratefulOpen, setGratefulOpen] = useState(false);
  const openGrateful = (open: boolean) => transition(open ? 'forward' : 'back', () => setGratefulOpen(open));
  // The newest thing the person was grateful for, under the tile, like the kinds' newest titles.
  const grateful = (useServiceData(reflectionService.subscribe, () => reflectionService.all()) ?? [])
    .filter((reflection) => reflection.promptKey === GRATITUDE)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (shelf) return <CaptureKindPage key={shelf} shelf={shelf} onBack={() => go(null)} />;
  if (gratefulOpen) return <GratitudePage onBack={() => openGrateful(false)} />;

  return (
    <div className="page">
      <PageHeader title="Capture" subtitle="Get it out of your head." settings />

      <div className="kind-list">
        {captureKinds.map(({ id, label, prompt, icon: Icon }) => (
          <button key={id} type="button" className="kind-tile" onClick={() => go(id)}>
            <span className="kind-tile__icon">
              <Icon size={28} />
            </span>
            <span className="kind-tile__text">
              <span className="kind-tile__title">{label}</span>
              <span className="kind-tile__prompt">{glimpse(openOn(id), prompt)}</span>
            </span>
            <ChevronRightIcon size={18} className="kind-tile__chevron" />
          </button>
        ))}
        {shows('gratitude') && (
          <button type="button" className="kind-tile" onClick={() => openGrateful(true)}>
            <span className="kind-tile__icon">
              <StarIcon size={28} />
            </span>
            <span className="kind-tile__text">
              <span className="kind-tile__title">Grateful</span>
              <span className="kind-tile__prompt">{grateful[0]?.body ?? 'I’m grateful for…'}</span>
            </span>
            <ChevronRightIcon size={18} className="kind-tile__chevron" />
          </button>
        )}
        {unsorted.length > 0 && (
          <button type="button" className="kind-tile kind-tile--unsorted" onClick={() => go('UNSORTED')}>
            <span className="kind-tile__icon">
              <InboxIcon size={28} />
            </span>
            <span className="kind-tile__text">
              <span className="kind-tile__title">{shelfTitles.UNSORTED.title}</span>
              <span className="kind-tile__prompt">{glimpse(unsorted, '')}</span>
            </span>
            <ChevronRightIcon size={18} className="kind-tile__chevron" />
          </button>
        )}
        {shows('brain-dump') && (
          <button type="button" className="kind-tile kind-tile--dump" onClick={() => setDumping(true)}>
            <span className="kind-tile__icon">
              <InboxIcon size={28} />
            </span>
            <span className="kind-tile__text">
              <span className="kind-tile__title">Empty your head</span>
              <span className="kind-tile__prompt">Everything at once; it gets split up for you to check</span>
            </span>
            <ChevronRightIcon size={18} className="kind-tile__chevron" />
          </button>
        )}
      </div>
      {dumping && <BrainDumpSheet onClose={() => setDumping(false)} />}

      <div className="stack-tight">
        <CaptureBar placeholder="Or anything at all" />
        <p className="sheet__hint">Without a kind, it waits in Not sorted yet.</p>
      </div>
    </div>
  );
}
