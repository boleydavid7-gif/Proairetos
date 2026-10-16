import { PrintSheet } from '../../app/family/PrintSheet';
import { say } from '../../app/family/shell';
import { ShareIcon } from '../../app/family/icons';
import { parseLocalDate, toLocalDate } from '../../core/scheduling/dates';
import type { PhytonNav } from '../app/App';
import { settings, usePlants } from '../app/state';
import { sitterRows, sitterText } from '../core/sitter';

const long = (day: string) => parseLocalDate(day).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

/** A sheet for whoever waters while the person is away: printed, saved as PDF, or sent as text. */
export default function SitterPage({ nav }: { nav: PhytonNav }) {
  const plants = usePlants();
  const current = settings.use();
  const today = toLocalDate(new Date());
  const away = current.away && current.away.to >= today ? current.away : undefined;
  const rows = sitterRows(plants, today, current.hemisphere);

  const share = async () => {
    const text = sitterText(rows, away, long);
    try {
      if (navigator.share) await navigator.share({ title: 'Plants', text });
      else {
        await navigator.clipboard.writeText(text);
        say('Copied');
      }
    } catch {
      // Closed without sharing.
    }
  };

  return (
    <PrintSheet
      title={away ? `Plants, ${long(away.from)} to ${long(away.to)}` : 'Plants'}
      onBack={nav.back}
      choices={rows.length > 0 && <button type="button" className="chip" onClick={() => void share()}><ShareIcon size={16} />Send as text</button>}
    >
      {rows.length === 0 && <p>No plants yet.</p>}
      {rows.length > 0 && (
        <ul className="sitter-list">
          {rows.map((row) => (
            <li key={row.name + (row.place ?? '')}>
              <h2>{row.name}{row.place && <span> · {row.place}</span>}</h2>
              <p>{row.water}. {row.often}.</p>
              {row.notes && <p>{row.notes}</p>}
              {row.pets && <p className="sitter-list__pets">{row.pets}</p>}
            </li>
          ))}
        </ul>
      )}
      <p className="print-note">Touch the soil first; if it’s still moist, leave it a day or two. From Phyton.</p>
    </PrintSheet>
  );
}
