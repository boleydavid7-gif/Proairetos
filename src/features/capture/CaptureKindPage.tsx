import { useState } from 'react';
import { useBackHandler } from '../../app/back/backStack';
import { useClock } from '../../app/hooks/useClock';
import { usePersonalDay } from '../../app/hooks/usePersonalDay';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useTodayParts } from '../../app/hooks/useTodayParts';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { lifeService } from '../../app/services';
import { ArrowLeftIcon, ChevronRightIcon, InboxIcon } from '../../components/icons/Icons';
import GentleLine from '../../components/ui/GentleLine';
import QuietOffer from '../../components/ui/QuietOffer';
import { kindOf, type ItemKind } from '../../core/life-items/kinds';
import type { LifeItem } from '../../core/life-items/types';
import { toLocalDate } from '../../core/scheduling/dates';
import { hideOffer, takeOffer } from '../../data/storage/preferences';
import CheckRow from '../items/CheckRow';
import { formatDay } from '../items/dateFields';
import CaptureBar from '../now/components/CaptureBar';
import { dayLabel } from '../reflect/format';
import { captureKinds } from './captureKinds';
import QuickSortSheet from './QuickSortSheet';

export type CaptureShelf = ItemKind | 'UNSORTED';

/** Each kind's page, in its own words. */
export const shelfTitles: Record<CaptureShelf, { title: string; line: string }> = {
  TODO: { title: 'To do', line: 'Things to do, when you choose to.' },
  REMEMBER: { title: 'Remember', line: 'Kept here so your mind can let go of them.' },
  CONCERN: { title: 'Concerns', line: 'What is on your mind. Some of it may be up to you.' },
  IDEA: { title: 'Ideas', line: 'For later, or for never. Both are fine.' },
  FEELING: { title: 'Feelings', line: 'Named, so they can be met.' },
  UNSORTED: { title: 'Not sorted yet', line: 'Captured without a kind. Sort them when you like, or not at all.' },
};

const newestFirst = (a: LifeItem, b: LifeItem) => b.createdAt.localeCompare(a.createdAt);

function when(item: LifeItem): string {
  return `${dayLabel(item.createdAt)} ${new Date(item.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

export const shelfOf = (item: LifeItem): CaptureShelf => kindOf(item) ?? 'UNSORTED';

/**
 * One kind of capture on its own page: a box to add more of it, and what is
 * there already, newest first. Only what came through Capture; things added
 * straight to a day live in Days ahead.
 */
export default function CaptureKindPage({ shelf, onBack }: { shelf: CaptureShelf; onBack: () => void }) {
  useBackHandler(true, onBack);
  const items = useServiceData(lifeService.subscribe, () => lifeService.list()) ?? [];
  const { openItem, openPractice, openThinkThrough } = useOverlays();
  const { today } = usePersonalDay(useClock());
  const shows = useTodayParts();
  const [offering, setOffering] = useState<'sit-with-it' | 'think-it-through' | null>(null);
  const [offerFrom, setOfferFrom] = useState<LifeItem | undefined>();
  const [sorting, setSorting] = useState(false);
  const kind = shelf === 'UNSORTED' ? undefined : shelf;
  const tile = captureKinds.find((option) => option.id === kind);
  const Icon = tile?.icon ?? InboxIcon;

  const mine = items.filter((item) => item.source !== 'MANUAL' && shelfOf(item) === shelf);
  const open = mine.filter((item) => item.status === 'OPEN' || item.status === 'WAITING').sort(newestFirst);
  const closed = mine
    .filter((item) => item.status === 'DONE' || item.status === 'LET_GO')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 20);

  return (
    <div className="page capture-shelf">
      <button type="button" className="back-link" onClick={onBack}>
        <ArrowLeftIcon size={18} />
        Capture
      </button>
      <header className="capture-shelf__head">
        <span className="kind-tile__icon">
          <Icon size={28} />
        </span>
        <div>
          <h1 className="page-header__title">{shelfTitles[shelf].title}</h1>
          <p className="page-header__subtitle">{shelfTitles[shelf].line}</p>
        </div>
      </header>

      <div className="stack-tight">
        <CaptureBar
          kind={kind}
          placeholder={tile?.prompt ?? 'Anything at all'}
          onCaptured={(item) => {
            // After naming a feeling or a worry, a practice is offered, quietly and at most once a day.
            const day = toLocalDate(new Date());
            if (kind === 'FEELING' && takeOffer('sit-with-it', day)) setOffering('sit-with-it');
            if (kind === 'CONCERN' && takeOffer('think-it-through', day)) {
              setOffering('think-it-through');
              setOfferFrom(item);
            }
          }}
        />
        {offering && (
          <QuietOffer
            text={offering === 'sit-with-it' ? 'Sit with it for a minute' : 'Think it through'}
            onAccept={() => {
              setOffering(null);
              if (offering === 'sit-with-it') openPractice('sit-with-it');
              else openThinkThrough(offerFrom ? { itemId: offerFrom.id, text: offerFrom.title } : undefined);
            }}
            onNotForMe={() => {
              hideOffer(offering);
              setOffering(null);
            }}
            onDismiss={() => setOffering(null)}
          />
        )}
      </div>

      {open.length > 0 ? (
        <section className="plan-section" aria-label={shelfTitles[shelf].title}>
          {shelf === 'UNSORTED' && shows('sort-through') && open.length > 0 && (
            <div className="section-heading">
              <span />
              <button type="button" className="text-link" onClick={() => setSorting(true)}>
                Sort through
              </button>
            </div>
          )}
          <ul className="check-list">
            {open.map((item) => (
              <CheckRow key={item.id} item={item} done={false} detail={when(item)} />
            ))}
          </ul>
        </section>
      ) : (
        <div className="empty-state">
          <p className="empty-state__title">{closed.length > 0 ? 'All clear here.' : 'Nothing here yet.'}</p>
          <GentleLine />
        </div>
      )}
      {sorting && <QuickSortSheet items={items} today={today} unsortedFirst onClose={() => setSorting(false)} />}

      {closed.length > 0 && (
        <details className="closed-list">
          <summary>Closed recently</summary>
          <div className="stack-tight">
            {closed.map((item) => (
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
      )}
    </div>
  );
}
