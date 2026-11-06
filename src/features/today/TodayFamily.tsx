import { useTodayParts } from '../../app/hooks/useTodayParts';
import { ChevronRightIcon } from '../../components/icons/Icons';
import SwipeLine from './SwipeLine';
import { BookIcon } from '../../components/icons/Icons';
import { ideas, notes } from '../../mneme/app/state';
import { needsPursuitCheckIn, pursuits } from '../../app/pursuits';
import { useNavigate } from '../../app/navigationContext';
import { openCompassTab } from '../compass/CompassPage';
import { openPursuit } from '../compass/PursuitsSection';

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
    <SwipeLine id={idea ? `mneme:idea:${idea.id}` : `mneme:note:${note!.id}`} title={title}>
      <a className="quiet-row" href={`/mneme/?open=${idea ? 'ideas' : 'notes'}`}>
        <span className="quiet-row__icon" aria-hidden="true"><BookIcon size={20} /></span>
        <span className="quiet-row__text">
          <span>{title}{more}</span>
          <span className="quiet-row__detail">{idea ? 'Ready for a next step · Mneme' : 'Pinned note · Mneme'}</span>
        </span>
        <ChevronRightIcon size={18} className="quiet-row__chevron" />
      </a>
    </SwipeLine>
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
  const detail = due ? `No check-in recently · ${current.title}` : `Next move · ${current.title}`;
  return (
    <SwipeLine id={`pursuit:${current.id}`} title={title}>
      <button type="button" className="quiet-row" onClick={() => { openPursuit(current.id); openCompassTab('motion'); navigate('compass'); }}>
        <span className="quiet-row__icon" aria-hidden="true"><BookIcon size={20} /></span>
        <span className="quiet-row__text">
          <span>{title}</span>
          <span className="quiet-row__detail">{detail}</span>
        </span>
        <ChevronRightIcon size={18} className="quiet-row__chevron" />
      </button>
    </SwipeLine>
  );
}
