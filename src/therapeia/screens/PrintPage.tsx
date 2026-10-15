import { useState } from 'react';
import { PrintPart, PrintSheet, PrintTable } from '../../app/family/PrintSheet';
import { parseLocalDate, toLocalDate } from '../../core/scheduling/dates';
import type { TherapeiaNav } from '../app/App';
import { appointments, readings, settings, useMedicines } from '../app/state';
import { daysText, isCurrent, splitAppointments, timeText, type Medicine } from '../core/medicines';
import { latestLines } from '../core/readings';
import { changeText } from '../core/history';

const day = (date: string) => parseLocalDate(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

function when(medicine: Medicine): string {
  const times = medicine.times.length ? `${medicine.times.map(timeText).join(', ')}; ${daysText(medicine.days).toLowerCase()}` : '';
  return [times, medicine.asNeeded ? `as needed${medicine.gapHours ? `, ${medicine.gapHours} h apart` : ''}` : ''].filter(Boolean).join('; ');
}

/** The medicines being taken on one sheet, for a doctor, a pharmacist or a bag. */
export default function PrintPage({ nav }: { nav: TherapeiaNav }) {
  const today = toLocalDate(new Date());
  const current = useMedicines().filter((medicine) => isCurrent(medicine, today)).sort((a, b) => a.name.localeCompare(b.name));
  const card = settings.use().card;
  const kept = readings.use();
  const next = splitAppointments(appointments.use(), new Date()).coming.find((visit) => visit.questions.some((question) => !question.asked));
  const all = useMedicines();
  // What changed in the last six months, newest first: what a doctor or pharmacist asks about.
  const since = toLocalDate(new Date(Date.now() - 182 * 86_400_000));
  const changes = all
    .flatMap((medicine) => (medicine.changes ?? []).filter((change) => change.on >= since && change.what !== 'refilled').map((change) => ({ medicine, change })))
    .sort((a, b) => b.change.on.localeCompare(a.change.on));
  const [withChanges, setWithChanges] = useState(changes.length > 0);
  const [withReadings, setWithReadings] = useState(false);
  const [withQuestions, setWithQuestions] = useState(Boolean(next));
  const lines = withReadings ? latestLines(kept) : [];

  return (
    <PrintSheet
      title="Medicines"
      onBack={nav.back}
      choices={
        (kept.length > 0 || next || changes.length > 0) && (
          <>
            {changes.length > 0 && <button type="button" className="chip" aria-pressed={withChanges} onClick={() => setWithChanges(!withChanges)}>Recent changes</button>}
            {kept.length > 0 && <button type="button" className="chip" aria-pressed={withReadings} onClick={() => setWithReadings(!withReadings)}>Latest readings</button>}
            {next && <button type="button" className="chip" aria-pressed={withQuestions} onClick={() => setWithQuestions(!withQuestions)}>Questions for {next.with}</button>}
          </>
        )
      }
    >
      {current.length ? (
        <PrintTable
          columns={['Medicine', 'Dose', 'When', 'How', 'Since']}
          rows={current.map((medicine) => [medicine.name, medicine.dose, when(medicine), [medicine.how, medicine.end ? `until ${day(medicine.end)}` : undefined].filter(Boolean).join('; '), day(medicine.start)])}
        />
      ) : (
        <p>No medicines at present.</p>
      )}
      {(card.allergies || card.conditions || card.contact) && (
        <PrintPart title="Health card">
          <dl className="print-facts">
            {card.allergies && <><dt>Allergies</dt><dd>{card.allergies}</dd></>}
            {card.conditions && <><dt>Conditions</dt><dd>{card.conditions}</dd></>}
            {card.contact && <><dt>Contact</dt><dd>{card.contact}</dd></>}
          </dl>
        </PrintPart>
      )}
      {withChanges && changes.length > 0 && (
        <PrintPart title="Changes in the last six months">
          <PrintTable columns={['Date', 'Medicine', 'Change']} rows={changes.map(({ medicine, change }) => [day(change.on), medicine.name, changeText(change)])} />
        </PrintPart>
      )}
      {lines.length > 0 && (
        <PrintPart title="Latest readings">
          <ul>{lines.map((line) => <li key={line}>{line}</li>)}</ul>
        </PrintPart>
      )}
      {withQuestions && next && (
        <PrintPart title={`Questions for ${next.with}, ${new Date(next.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`}>
          <ul>{next.questions.filter((question) => !question.asked).map((question) => <li key={question.id}>{question.text}</li>)}</ul>
        </PrintPart>
      )}
      <p className="print-note">From Therapeia. A list kept by the person, not a prescription.</p>
    </PrintSheet>
  );
}
