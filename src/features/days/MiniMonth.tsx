import { useState } from 'react';
import { ChevronRightIcon } from '../../components/icons/Icons';
import { addDays } from '../../core/scheduling/dates';

const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

/**
 * A small month beside the week on a computer: pick any day to bring its week into view. The seven days on
 * show are lightly banded, and today is gold.
 */
export default function MiniMonth({ shown, today, onPick }: { shown: string; today: string; onPick: (date: string) => void }) {
  const [anchor, setAnchor] = useState(() => shown.slice(0, 7));
  const [year, month] = anchor.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const lead = first.getDay();
  const length = new Date(year, month, 0).getDate();
  const cells = Array.from({ length: Math.ceil((lead + length) / 7) * 7 }, (_, i) => {
    const day = i - lead + 1;
    return day >= 1 && day <= length ? keyOf(year, month - 1, day) : null;
  });
  const step = (n: number) => {
    const d = new Date(year, month - 1 + n, 1);
    setAnchor(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  };
  const end = addDays(shown, 6);

  return (
    <div className="mini" role="group" aria-label="Pick a day">
      <div className="mini__head">
        <span className="mini__title">{first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
        <span className="mini__steps">
          <button type="button" aria-label="Earlier month" onClick={() => step(-1)}>
            <ChevronRightIcon size={16} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <button type="button" aria-label="Later month" onClick={() => step(1)}>
            <ChevronRightIcon size={16} />
          </button>
        </span>
      </div>
      <div className="mini__grid" aria-hidden="true">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((letter, index) => (
          <span key={index} className="mini__dow">
            {letter}
          </span>
        ))}
      </div>
      <div className="mini__grid">
        {cells.map((date, index) =>
          date ? (
            <button
              key={date}
              type="button"
              className={`mini__day${date === today ? ' mini__day--today' : ''}${date >= shown && date <= end ? ' mini__day--in' : ''}`}
              aria-label={new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              aria-current={date === today ? 'date' : undefined}
              onClick={() => onPick(date)}
            >
              {Number(date.slice(8))}
            </button>
          ) : (
            <span key={`blank-${index}`} />
          ),
        )}
      </div>
    </div>
  );
}
