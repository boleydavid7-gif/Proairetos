import { useState } from 'react';
import { useClock } from '../../app/hooks/useClock';
import { useServiceData } from '../../app/hooks/useServiceData';
import { lifeService } from '../../app/services';
import { ChevronRightIcon } from '../../components/icons/Icons';
import CheckRow from '../items/CheckRow';
import PageHeader from '../../components/layout/PageHeader';
import { addDays, toLocalDate } from '../../core/scheduling/dates';
import { formatLocalDay } from '../schedule/format';
import { dayTitle } from '../today/timeline';
import AddTaskSheet from './AddTaskSheet';
import { planFor } from './planView';

export default function PlanPage() {
  const clock = useClock();
  const today = toLocalDate(clock);
  const [offset, setOffset] = useState(0);
  const [adding, setAdding] = useState(false);
  const date = addDays(today, offset);
  const items = useServiceData(lifeService.subscribe, () => lifeService.list());
  if (!items) return null;
  const sections = planFor(date, today, items);

  return (
    <div className="page">
      <PageHeader title="Plan" subtitle="A calmer day is a more intentional day." settings />

      <div className="date-card">
        <button type="button" className="day-stepper__step" aria-label="Previous day" onClick={() => setOffset(offset - 1)}>
          <ChevronRightIcon size={20} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <button type="button" className="date-card__text" onClick={() => setOffset(0)} aria-label="Back to today">
          <span className="date-card__title">{dayTitle(date, today)}</span>
          <span className="date-card__date">{formatLocalDay(date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </button>
        <button type="button" className="day-stepper__step" aria-label="Next day" onClick={() => setOffset(offset + 1)}>
          <ChevronRightIcon size={20} />
        </button>
      </div>

      {sections.map((section) => (
        <section key={section.id} className="plan-section" aria-label={section.label}>
          <h2 className="section-label">{section.label}</h2>
          <ul className="check-list">
            {section.open.map((item) => (
              <CheckRow key={item.id} item={item} done={false} />
            ))}
            {section.done.map((item) => (
              <CheckRow key={item.id} item={item} done />
            ))}
          </ul>
        </section>
      ))}

      {sections.length === 0 && (
        <p className="empty-note">Nothing planned for {offset === 0 ? 'today' : 'this day'}. Add something if you like.</p>
      )}

      <button type="button" className="button-accent button-accent--wide" onClick={() => setAdding(true)}>
        + Add task
      </button>

      {adding && <AddTaskSheet date={date} onClose={() => setAdding(false)} />}
    </div>
  );
}
