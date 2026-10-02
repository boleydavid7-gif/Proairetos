import { useState } from 'react';
import QuietOffer from '../../components/ui/QuietOffer';
import GentleLine from '../../components/ui/GentleLine';
import { hideOffer, takeOffer } from '../../data/storage/preferences';
import { toLocalDate } from '../../core/scheduling/dates';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { lifeService } from '../../app/services';
import { ChevronRightIcon, InboxIcon } from '../../components/icons/Icons';
import PageHeader from '../../components/layout/PageHeader';
import type { LifeItem } from '../../core/life-items/types';
import { formatDay } from '../items/dateFields';
import CheckRow from '../items/CheckRow';
import CaptureBar from '../now/components/CaptureBar';
import { dayLabel } from '../reflect/format';
import { captureKinds } from './captureKinds';
import { kindLabel, kindOf, type ItemKind } from '../../core/life-items/kinds';
import BrainDumpSheet from './BrainDumpSheet';
import QuickSortSheet, { sortable } from './QuickSortSheet';
import { useClock } from '../../app/hooks/useClock';
import { usePersonalDay } from '../../app/hooks/usePersonalDay';
import { useTodayParts } from '../../app/hooks/useTodayParts';

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

/** What it is (as tagged or sorted) and when it arrived. */
function captureDetail(item: LifeItem): string {
  const what = kindLabel(kindOf(item));
  const when = `${dayLabel(item.createdAt)} ${new Date(item.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  return what ? `${what} · ${when}` : when;
}

const newestFirst = (a: LifeItem, b: LifeItem) => b.createdAt.localeCompare(a.createdAt);
const SHOWN = 12;
const CLOSED_SHOWN = 20;

export default function CapturePage() {
  const items = useServiceData(lifeService.subscribe, () => lifeService.list()) ?? [];
  const [kind, setKind] = useState<ItemKind | undefined>();
  const [showAll, setShowAll] = useState(false);
  const [offering, setOffering] = useState<'sit-with-it' | 'think-it-through' | null>(null);
  const [offerFrom, setOfferFrom] = useState<LifeItem | undefined>();
  const [dumping, setDumping] = useState(false);
  const [sorting, setSorting] = useState(false);
  const { today } = usePersonalDay(useClock());
  const shows = useTodayParts();
  const { openPractice, openThinkThrough } = useOverlays();
  // Tasks added on Plan live there; this list is what came through Capture.
  const active = items
    .filter((item) => (item.status === 'OPEN' || item.status === 'WAITING') && item.source !== 'MANUAL')
    .sort(newestFirst);
  const shown = showAll ? active : active.slice(0, SHOWN);
  const closed = items
    .filter((item) => item.status === 'DONE' || item.status === 'LET_GO')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, CLOSED_SHOWN);
  const chosen = captureKinds.find((option) => option.id === kind);

  return (
    <div className="page">
      <PageHeader title="Capture" subtitle="Get it out of your head. Sorting can wait." settings />

      <div className="kind-list" role="group" aria-label="What kind (optional)">
        {captureKinds.map(({ id, label, prompt, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className="kind-tile"
            aria-pressed={kind === id}
            onClick={() => setKind(kind === id ? undefined : id)}
          >
            <span className="kind-tile__icon">
              <Icon size={28} />
            </span>
            <span className="kind-tile__text">
              <span className="kind-tile__title">{label}</span>
              <span className="kind-tile__prompt">{prompt}</span>
            </span>
            <ChevronRightIcon size={18} className="kind-tile__chevron" />
          </button>
        ))}
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
        <CaptureBar
          kind={kind}
          placeholder={chosen?.prompt ?? 'Or anything at all'}
          onCaptured={(item) => {
            // After naming a feeling or a worry, a practice is offered, quietly and at most once a day.
            const today = toLocalDate(new Date());
            if (kind === 'FEELING' && takeOffer('sit-with-it', today)) setOffering('sit-with-it');
            if (kind === 'CONCERN' && takeOffer('think-it-through', today)) {
              setOffering('think-it-through');
              setOfferFrom(item);
            }
            setKind(undefined);
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
        {chosen && (
          <button type="button" className="text-link capture-kind-clear" onClick={() => setKind(undefined)}>
            Tagged as {chosen.label.toLowerCase()} · Clear
          </button>
        )}
      </div>

      {active.length > 0 && (
        <section className="plan-section" aria-label="Recent captures">
          <div className="section-heading">
            <h2 className="section-label">Recent captures</h2>
            {shows('sort-through') && sortable(items, today).length > 1 && (
              <button type="button" className="text-link" onClick={() => setSorting(true)}>
                Sort through
              </button>
            )}
          </div>
          {sorting && <QuickSortSheet items={items} today={today} onClose={() => setSorting(false)} />}
          <ul className="check-list">
            {shown.map((item) => (
              <CheckRow key={item.id} item={item} done={false} detail={captureDetail(item)} />
            ))}
          </ul>
          {active.length > SHOWN && (
            <button type="button" className="text-link" onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Show fewer' : `Show all ${active.length}`}
            </button>
          )}
        </section>
      )}

      {active.length === 0 && (
        <div className="empty-state">
          <p className="empty-state__title">{closed.length > 0 ? 'All clear.' : 'Nothing captured yet.'}</p>
          <p className="empty-state__detail">Whatever is on your mind can go here.</p>
          {closed.length > 0 && <GentleLine />}
        </div>
      )}

      <ClosedItems items={closed} />
    </div>
  );
}
