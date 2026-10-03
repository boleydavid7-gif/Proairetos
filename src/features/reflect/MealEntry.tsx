import { namesList, type CookedFor } from '../../app/soma/meals';
import { LeafIcon } from '../../components/icons/Icons';
import { dayLabel } from './format';

/** A meal cooked for someone, as marked in SOMA. Opens SOMA. */
export default function MealEntry({ meal, showDay }: { meal: CookedFor; showDay: boolean }) {
  return (
    <li className="timeline-entry">
      <span className="timeline-entry__mark" role="img" aria-label="A meal, from SOMA">
        <LeafIcon size={30} />
      </span>
      <div className="timeline-entry__body">
        {showDay && (
          <div className="timeline-entry__head">
            <span className="timeline-entry__time">{dayLabel(`${meal.day}T12:00:00`)}</span>
          </div>
        )}
        <span className="timeline-entry__prompt">From SOMA</span>
        <a className="timeline-entry__text run-entry__text" href="/soma/">
          Cooked for {namesList(meal.people)}
          <span className="run-entry__words">{meal.title}</span>
        </a>
      </div>
    </li>
  );
}
