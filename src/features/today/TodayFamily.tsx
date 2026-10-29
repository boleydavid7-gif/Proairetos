import type { Bill } from '../../oikonomia/core/bills';
import { billsSoon } from '../../app/family/glance';
import { useStore } from '../../app/family/read';
import { useTodayParts } from '../../app/hooks/useTodayParts';
import { ChevronRightIcon, ListIcon } from '../../components/icons/Icons';
import NotForMe from './NotForMe';
import { BookIcon } from '../../components/icons/Icons';
import { ideas, notes } from '../../mneme/app/state';
import { needsPursuitCheckIn, pursuits } from '../../app/pursuits';
import { useNavigate } from '../../app/navigationContext';
import { openCompassTab } from '../compass/CompassPage';
import { openPursuit } from '../compass/PursuitsSection';

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
      <a className="quiet-row" href={new Set(soon.map((bill) => bill.id)).size === 1 ? `/oikonomia/?open=bill:${encodeURIComponent(soon[0].id)}` : '/oikonomia/'}>
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
  const navigate = useNavigate();
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
      <button type="button" className="quiet-row" onClick={() => { openPursuit(current.id); openCompassTab('motion'); navigate('compass'); }}>
        <span className="quiet-row__icon" aria-hidden="true"><BookIcon size={20} /></span>
        <span className="quiet-row__text">
          <span>{title}</span>
          <span className="quiet-row__detail">{detail}</span>
        </span>
        <ChevronRightIcon size={18} className="quiet-row__chevron" />
      </button>
    </div>
  );
}
