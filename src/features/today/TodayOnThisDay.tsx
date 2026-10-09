import { useState, useSyncExternalStore } from 'react';
import { lock } from '../../app/lock/lock';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useTodayParts } from '../../app/hooks/useTodayParts';
import { reflectionService } from '../../app/services';
import { ChevronRightIcon, BookIcon } from '../../components/icons/Icons';
import { onThisDay } from '../../core/reflections/lookBack';
import NotForMe from './NotForMe';

/**
 * What was written on this day in an earlier year, offered quietly and only if the person turned it on.
 * Their own words, nothing added. Hidden while Reflect is locked.
 */
export default function TodayOnThisDay({ today }: { today: string }) {
  const shows = useTodayParts();
  const locked = useSyncExternalStore(lock.subscribe, lock.isLocked);
  const [open, setOpen] = useState<string | null>(null);
  const reflections = useServiceData(reflectionService.subscribe, () => reflectionService.all());
  if (!shows('on-this-day') || locked || !reflections) return null;
  const found = onThisDay(reflections, today, 2);
  if (found.length === 0) return null;
  return (
    <div className="quiet-row-wrap">
      {found.map(({ reflection, yearsAgo }) => {
        const expanded = open === reflection.id;
        return (
          <button
            key={reflection.id}
            type="button"
            className="quiet-row quiet-row--button"
            aria-expanded={expanded}
            onClick={() => setOpen(expanded ? null : reflection.id)}
          >
            <span className="quiet-row__icon" aria-hidden="true">
              <BookIcon size={20} />
            </span>
            <span className="quiet-row__text">
              <span>{yearsAgo === 1 ? 'A year ago today' : `${yearsAgo} years ago today`}</span>
              <span className={`quiet-row__detail${expanded ? ' quiet-row__detail--full' : ''}`}>
                {expanded || reflection.body.length <= 140 ? reflection.body : `${reflection.body.slice(0, 140).trim()}…`}
              </span>
            </span>
            <ChevronRightIcon size={18} className="quiet-row__chevron" />
          </button>
        );
      })}
      <NotForMe part="on-this-day" />
    </div>
  );
}
