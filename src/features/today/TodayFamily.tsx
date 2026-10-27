import type { Bill } from '../../oikonomia/core/bills';
import { billsSoon } from '../../app/family/glance';
import { useStore } from '../../app/family/read';
import { useTodayParts } from '../../app/hooks/useTodayParts';
import { ChevronRightIcon, ListIcon } from '../../components/icons/Icons';
import NotForMe from './NotForMe';
import { lookAgainBy, useStudy } from '../../app/praxis/study';
import { highlightOfDay } from '../../theoria/core/export';
import type { TheoriaBook } from '../../theoria/core/books';
import { BookIcon } from '../../components/icons/Icons';
import { ideas, notes } from '../../mneme/app/state';
import { needsPursuitCheckIn, pursuits } from '../../app/pursuits';

/**
 * Bills with a date in the next few days and no payment recorded (Settings > What's included can set them aside),
 * only when there is one. It opens Oikonomia. Nothing here counts, scores
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
              .map((bill) => bill.name)
              .join(', ')}
            {soon.length > 2 ? ` and ${soon.length - 2} more` : ''}
          </span>
          <span className="quiet-row__detail">
            {soon.every((bill) => bill.when === soon[0].when) ? `Bills due ${soon[0].when}` : `Bills from ${soon[0].when}`} · Oikonomia
          </span>
        </span>
        <ChevronRightIcon size={18} className="quiet-row__chevron" />
      </a>
      <NotForMe part="bills" />
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
          <span className="quiet-row__detail">To look at again · Praxis</span>
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

/** A small, actionable signal from Mneme: ideas ready for a next step, or a pinned note to revisit. */
export function TodayMneme() {
  const shows = useTodayParts();
  const allIdeas = ideas.use();
  const allNotes = notes.use();
  if (!shows('mneme')) return null;
  const next = allIdeas.filter((idea) => idea.stage === 'next').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const pinned = allNotes.filter((note) => !note.archived && note.pinned && note.kind !== 'idea').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const idea = next[0];
  const note = pinned[0];
  if (!idea && !note) return null;
  const title = idea ? idea.text.replace(/\s+/g, ' ').trim().slice(0, 72) : note?.title || 'Pinned note';
  const more = idea && next.length > 1 ? ` · ${next.length - 1} more` : note && pinned.length > 1 ? ` · ${pinned.length - 1} more` : '';
  return (
    <div className="quiet-row-wrap">
      <a className="quiet-row" href={`/mneme/?open=${idea ? 'ideas' : 'notes'}`}>
        <span className="quiet-row__icon" aria-hidden="true"><BookIcon size={20} /></span>
        <span className="quiet-row__text">
          <span>{title}{more}</span>
          <span className="quiet-row__detail">{idea ? 'Ready for a next step · Mneme' : 'Pinned note · Mneme'}</span>
        </span>
        <ChevronRightIcon size={18} className="quiet-row__chevron" />
      </a>
    </div>
  );
}

/** The next visible move from an active Pursuit. The work remains in Compass; Today only keeps it close. */
export function TodayPursuit() {
  const shows = useTodayParts();
  const all = pursuits.use();
  if (!shows('pursuits')) return null;
  const due = all.filter((pursuit) => needsPursuitCheckIn(pursuit)).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))[0];
  const current = due ?? all
    .filter((pursuit) => pursuit.status === 'active' && pursuit.nextMove?.trim())
    .sort((a, b) => (a.dueDate ?? a.nextMoveDue ?? '9999-12-31').localeCompare(b.dueDate ?? b.nextMoveDue ?? '9999-12-31') || b.updatedAt.localeCompare(a.updatedAt))[0];
  if (!current || (!due && !current.nextMove)) return null;
  const title = due ? `Check in: ${current.title}` : current.nextMove!;
  const detail = due ? `No check-in recently · ${current.title} · Compass` : `Next move · ${current.title} · Compass`;
  return (
    <div className="quiet-row-wrap">
      <a className="quiet-row" href="/compass/">
        <span className="quiet-row__icon" aria-hidden="true"><BookIcon size={20} /></span>
        <span className="quiet-row__text">
          <span>{title}</span>
          <span className="quiet-row__detail">{detail}</span>
        </span>
        <ChevronRightIcon size={18} className="quiet-row__chevron" />
      </a>
    </div>
  );
}
