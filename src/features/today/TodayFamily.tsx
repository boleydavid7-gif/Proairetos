import type { Bill } from '../../oikonomia/core/bills';
import { billsSoon } from '../../app/family/glance';
import { useStore } from '../../app/family/read';
import { useTodayParts } from '../../app/hooks/useTodayParts';
import { ChevronRightIcon, ListIcon, RiverIcon } from '../../components/icons/Icons';
import NotForMe from './NotForMe';
import type { ScheduleOccurrence } from '../../core/scheduling/types';
import { waterDuring } from '../../app/family/glance';
import { lookAgainBy, useStudy } from '../../app/praxis/study';
import { highlightOfDay } from '../../theoria/core/export';
import type { TheoriaBook } from '../../theoria/core/books';
import { BookIcon } from '../../components/icons/Icons';

/**
 * Bills with a date in the next few days and no payment recorded, only if the person switched them on in
 * Settings > What's included, and only when there is one. It opens Oikonomia. Nothing here counts, scores
 * or advises.
 */
export default function TodayFamily({ today }: { today: string }) {
  const shows = useTodayParts();
  const bills = useStore<Bill>('oikonomiaBills', shows('bills'));
  if (!shows('bills')) return null;
  const soon = billsSoon(bills, today);
  if (soon.length === 0) return null;
  return (
    <div className="quiet-row-wrap">
      <a className="quiet-row" href="/oikonomia/">
        <span className="quiet-row__icon" aria-hidden="true">
          <ListIcon size={20} />
        </span>
        <span className="quiet-row__text">
          <span>
            {soon
              .slice(0, 2)
              .map((bill) => `${bill.name} ${bill.when}`)
              .join(' · ')}
          </span>
          <span className="quiet-row__detail">{soon.length > 2 ? `And ${soon.length - 2} more in Oikonomia.` : 'Coming up in Oikonomia.'}</span>
        </span>
        <ChevronRightIcon size={18} className="quiet-row__chevron" />
      </a>
      <NotForMe part="bills" />
    </div>
  );
}

type DrinkRecord = { amountOz?: number; loggedAt?: string };

/**
 * During a work block, if the person chose it: what they have logged in HYDROS since the block began, and a
 * way to log their usual glass (it opens HYDROS, which keeps the record). Facts only.
 */
export function TodayWater({ now, blocks }: { now: Date; blocks: readonly ScheduleOccurrence[] }) {
  const shows = useTodayParts();
  const drinks = useStore<DrinkRecord>('hydrosDrinks', shows('water'));
  if (!shows('water')) return null;
  const water = waterDuring(drinks, blocks, now);
  if (!water) return null;
  return (
    <div className="quiet-row-wrap">
      <a className="quiet-row" href="/hydros/?open=glass">
        <span className="quiet-row__icon" aria-hidden="true">
          <RiverIcon size={20} />
        </span>
        <span className="quiet-row__text">
          <span>{water.line}</span>
          <span className="quiet-row__detail">Log a glass in HYDROS</span>
        </span>
        <ChevronRightIcon size={18} className="quiet-row__chevron" />
      </a>
      <NotForMe part="water" />
    </div>
  );
}

/** A Praxis block the person set to look at again, on the day they chose. Opens Praxis. */
export function TodayStudy({ today }: { today: string }) {
  const shows = useTodayParts();
  const study = useStudy(shows('praxis'));
  if (!shows('praxis')) return null;
  const again = lookAgainBy(study?.blocks ?? [], today);
  if (again.length === 0) return null;
  return (
    <div className="quiet-row-wrap">
      <a className="quiet-row" href="/praxis/">
        <span className="quiet-row__icon" aria-hidden="true">
          <BookIcon size={20} />
        </span>
        <span className="quiet-row__text">
          <span>{again.map((block) => block.title).slice(0, 2).join(' · ')}</span>
          <span className="quiet-row__detail">To look at again, in Praxis</span>
        </span>
        <ChevronRightIcon size={18} className="quiet-row__chevron" />
      </a>
      <NotForMe part="praxis" />
    </div>
  );
}

/** One passage the person highlighted in Theoria, a different one each day, if they turned it on. Opens the book. */
export function TodayHighlight({ today }: { today: string }) {
  const shows = useTodayParts();
  const books = useStore<TheoriaBook>('theoriaBooks', shows('highlight'));
  if (!shows('highlight')) return null;
  const chosen = highlightOfDay(books, today);
  if (!chosen) return null;
  return (
    <div className="quiet-row-wrap">
      <a className="quiet-row" href={`/theoria/?open=${encodeURIComponent(`book:${chosen.bookId}`)}`}>
        <span className="quiet-row__icon" aria-hidden="true">
          <BookIcon size={20} />
        </span>
        <span className="quiet-row__text">
          <span className="quiet-row__quote">“{chosen.text.length > 220 ? `${chosen.text.slice(0, 220).trim()}…` : chosen.text}”</span>
          <span className="quiet-row__detail">{chosen.author ? `${chosen.title}, ${chosen.author}` : chosen.title}</span>
        </span>
        <ChevronRightIcon size={18} className="quiet-row__chevron" />
      </a>
      <NotForMe part="highlight" />
    </div>
  );
}
