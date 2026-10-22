import { useState } from 'react';
import { tap } from '../../app/feel';
import { offerUndo } from '../../app/family/shell';
import { CheckIcon } from '../../app/family/icons';
import SwipeItem from '../../app/family/SwipeItem';
import { skip, take, takeNow, unmark, whoOf, withWho, type Dose, type Medicine } from '../core/medicines';
import { putMedicine, restoreMedicine } from './state';
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
  offerUndo(`${withWho(dose.medicine, dose.medicine.name)} taken`, () => restoreMedicine(dose.medicine));
}

export function markSkipped(dose: Dose): void {
  putMedicine(skip(dose.medicine, dose.slot, new Date()));
  offerUndo(`${withWho(dose.medicine, dose.medicine.name)} skipped`, () => restoreMedicine(dose.medicine));
}

export function takeOneNow(medicine: Medicine): void {
  tap();
  putMedicine(takeNow(medicine, new Date()));
  offerUndo(`${withWho(medicine, medicine.name)} taken`, () => restoreMedicine(medicine));
}

export function DoseRow({ dose, onOpen }: { dose: Dose; onOpen: () => void }) {
  const marked = dose.taken;
  return (
    <SwipeItem className="chore dose" label="Taken" off={Boolean(marked)} onSwipe={() => markTaken(dose)}>
      <button
        type="button"
        className="tick"
        aria-pressed={Boolean(marked && !marked.skipped)}
        aria-label={marked && !marked.skipped ? `${withWho(dose.medicine, dose.medicine.name)}: taken, undo` : `${withWho(dose.medicine, dose.medicine.name)}: taken`}
        onClick={() => {
          if (marked) {
            putMedicine(unmark(dose.medicine, dose.slot));
            offerUndo('Mark cleared', () => restoreMedicine(dose.medicine));
          } else markTaken(dose);
        }}
      >
        <CheckIcon size={20} />
      </button>
      <button type="button" className="chore__open" onClick={onOpen}>
        <span className="chore__name"><PillMark look={dose.medicine.look} size={22} />{dose.medicine.name}{whoOf(dose.medicine) ? <span className="who-chip">{whoOf(dose.medicine)}</span> : null}</span>
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
    </SwipeItem>
  );
}

/**
 * Who a medicine or visit is for: the person's own unless chosen. Names already used are one tap; "Someone else"
 * takes a new name. Folded into one link until another person is named anywhere.
 */
export function WhoChoice({ value, people, onChange }: { value: string; people: readonly string[]; onChange: (who: string) => void }) {
  const [open, setOpen] = useState(Boolean(value) || people.length > 0);
  const [typing, setTyping] = useState(Boolean(value) && !people.some((name) => name.toLowerCase() === value.trim().toLowerCase()));
  if (!open)
    return (
      <button type="button" className="text-link who-choice__open" onClick={() => {
        setOpen(true);
        setTyping(true);
      }}>
        For someone else
      </button>
    );
  return (
    <div className="field who-choice">
      <span className="field__label">For</span>
      <div className="chip-row" role="group" aria-label="For">
        <button type="button" className="chip" aria-pressed={!value && !typing} onClick={() => {
          setTyping(false);
          onChange('');
        }}>Me</button>
        {people.map((name) => (
          <button key={name} type="button" className="chip" aria-pressed={!typing && value.trim().toLowerCase() === name.toLowerCase()} onClick={() => {
            setTyping(false);
            onChange(name);
          }}>{name}</button>
        ))}
        <button type="button" className="chip" aria-pressed={typing} onClick={() => {
          setTyping(true);
          onChange('');
        }}>Someone else</button>
      </div>
      {typing && <input className="input" aria-label="Their name" placeholder="Their name" autoCapitalize="words" value={value} onChange={(event) => onChange(event.target.value)} />}
    </div>
  );
}
