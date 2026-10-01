import { useState } from 'react';
import { useServiceData } from '../../../app/hooks/useServiceData';
import { useNavigate } from '../../../app/navigationContext';
import { compassService, lifeService } from '../../../app/services';
import CompassRose from '../../../components/brand/CompassRose';
import { createDailyOrientation } from '../../../core/compass/orientation';
import { isLookAheadSetAside, setLookAheadAside } from '../../../data/storage/preferences';

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/**
 * A once-a-day look ahead built only from what the person wrote and
 * scheduled. It stays until they set it aside, whatever time their day starts.
 */
export default function LookAhead() {
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(() => isLookAheadSetAside());
  const values = useServiceData(compassService.subscribe, () => compassService.values());
  const statements = useServiceData(compassService.subscribe, () => compassService.statements());
  const items = useServiceData(lifeService.subscribe, () => lifeService.list());

  if (hidden || !values || !statements || !items) return null;

  const orientation = createDailyOrientation(values, statements, items, new Date());
  const setAside = () => {
    setLookAheadAside();
    setHidden(true);
  };

  if (orientation.values.length === 0 && orientation.remember.length === 0) {
    return (
      <section className="look-ahead look-ahead--invite" aria-label="Look ahead">
        <CompassRose size={44} tone="dark" />
        <div className="look-ahead__invite-text">
          <p className="look-ahead__title">Keep what matters in sight</p>
          <p className="look-ahead__detail">Choose your values in Compass and they will greet you here each day.</p>
          <div className="chip-row">
            <button type="button" className="chip chip--accent" onClick={() => navigate('compass')}>
              Open Compass
            </button>
            <button type="button" className="button-quiet" onClick={setAside}>
              Not today
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="look-ahead" aria-label="Look ahead">
      <p className="look-ahead__title">Look ahead</p>
      <p className="look-ahead__prompt">{orientation.prompt}</p>

      {orientation.values.length > 0 && (
        <ul className="look-ahead__values" aria-label="Your values">
          {orientation.values.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      )}

      {orientation.remember.map((line) => (
        <blockquote key={line} className="look-ahead__quote">
          {line}
        </blockquote>
      ))}

      {orientation.scheduledToday.length > 0 && (
        <div className="look-ahead__day">
          <p className="look-ahead__label">On your day</p>
          <ul>
            {orientation.scheduledToday.map((item) => (
              <li key={item.id}>
                <time dateTime={item.scheduledAt}>{timeOf(item.scheduledAt!)}</time> {item.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" className="button-quiet look-ahead__aside" onClick={setAside}>
        Set aside for today
      </button>
    </section>
  );
}
