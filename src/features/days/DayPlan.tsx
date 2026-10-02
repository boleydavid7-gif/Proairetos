import CheckRow from '../items/CheckRow';
import { describeRule } from '../../core/life-items/repeat';
import type { LifeItem } from '../../core/life-items/types';
import { planFor } from '../plan/planView';

/**
 * What is planned for a day without a time: to-dos and lists that come
 * back, grouped by the person's own marks. Things with a time are on the
 * day already, so they are not listed twice.
 */
export default function DayPlan({ date, today, items, range }: { date: string; today: string; items: LifeItem[]; range?: { start: Date; end: Date } }) {
  const untimed = (item: LifeItem) => !item.scheduledAt || Boolean(item.checklist);
  const sections = planFor(date, today, items, range)
    .map((section) => ({ ...section, open: section.open.filter(untimed), done: section.done.filter(untimed) }))
    .filter((section) => section.open.length + section.done.length > 0);
  if (sections.length === 0) return null;
  const labelled = sections.length > 1 || sections[0].id !== 'OTHER';

  return (
    <div className="day-plan" aria-label="Planned">
      {sections.map((section) => (
        <div key={section.id} className="day-plan__group">
          {labelled && <p className="day-plan__label">{section.label}</p>}
          <ul className="check-list">
            {section.open.map((item) => (
              <CheckRow
                key={item.id}
                item={item}
                done={false}
                detail={item.repeat && item.checklist ? `Comes back ${describeRule(item.repeat).toLowerCase()}` : undefined}
              />
            ))}
            {section.done.map((item) => (
              <CheckRow key={item.id} item={item} done />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
