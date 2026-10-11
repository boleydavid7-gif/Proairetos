import { tap } from '../../app/feel';
import { offerUndo } from '../../app/family/shell';
import { CheckIcon } from '../../app/family/icons';
import { skip, take, takeNow, unmark, type Dose, type Medicine } from '../core/medicines';
import { putMedicine } from './state';
import PillMark from './PillMark';

export const at = (date: Date) => date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export function dayWord(date: Date, today: string): string {
  const local = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  if (local === today) return 'Today';
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function markTaken(dose: Dose): void {
  tap();
  putMedicine(take(dose.medicine, dose.slot, new Date()));
  offerUndo(`${dose.medicine.name} taken`, () => putMedicine(dose.medicine));
}

export function markSkipped(dose: Dose): void {
  putMedicine(skip(dose.medicine, dose.slot, new Date()));
  offerUndo(`${dose.medicine.name} skipped`, () => putMedicine(dose.medicine));
}

export function takeOneNow(medicine: Medicine): void {
  tap();
  putMedicine(takeNow(medicine, new Date()));
  offerUndo(`${medicine.name} taken`, () => putMedicine(medicine));
}

export function DoseRow({ dose, onOpen }: { dose: Dose; onOpen: () => void }) {
  const marked = dose.taken;
  return (
    <li className="chore dose">
      <button
        type="button"
        className="tick"
        aria-pressed={Boolean(marked && !marked.skipped)}
        aria-label={marked && !marked.skipped ? `${dose.medicine.name}: taken, undo` : `${dose.medicine.name}: taken`}
        onClick={() => {
          if (marked) {
            putMedicine(unmark(dose.medicine, dose.slot));
            offerUndo('Mark cleared', () => putMedicine(dose.medicine));
          } else markTaken(dose);
        }}
      >
        <CheckIcon size={20} />
      </button>
      <button type="button" className="chore__open" onClick={onOpen}>
        <span className="chore__name"><PillMark look={dose.medicine.look} size={22} />{dose.medicine.name}</span>
        <small>{[dose.medicine.dose, dose.medicine.how].filter(Boolean).join(' · ') || dose.label}</small>
      </button>
      <span className="chore__when">
        {marked ? (marked.skipped ? 'Skipped' : `Taken ${at(new Date(marked.at))}`) : at(dose.at)}
        {!marked && (
          <button type="button" className="text-link dose__skip" onClick={() => markSkipped(dose)}>
            Skip
          </button>
        )}
      </span>
    </li>
  );
}
