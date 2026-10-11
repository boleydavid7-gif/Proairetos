import { useState } from 'react';
import { offerUndo } from '../../app/family/shell';
import { LineChart } from '../../app/family/charts';
import { toLocalDate } from '../../core/scheduling/dates';
import { newId, readings } from '../app/state';
import { KINDS, facts, series, valueText, type Reading, type ReadingKind } from '../core/readings';

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const short = (iso: string) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const localNow = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const number = (text: string) => {
  const value = Number(text.replace(',', '.'));
  return text.trim() && Number.isFinite(value) ? value : undefined;
};

export default function ReadingsPage() {
  const all = readings.use();
  const today = toLocalDate(new Date());
  const groups = series(all);
  const [kind, setKind] = useState<ReadingKind>(groups[0]?.latest.kind ?? 'blood-pressure');
  const units = KINDS.find((each) => each.id === kind)!.units;
  const lastUnit = all.filter((reading) => reading.kind === kind).sort((a, b) => b.at.localeCompare(a.at))[0]?.unit;
  const [unit, setUnit] = useState<string>();
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const [value2, setValue2] = useState('');
  const [at, setAt] = useState(localNow());
  const [note, setNote] = useState('');
  const [open, setOpen] = useState<string>();
  const chosenUnit = kind === 'other' ? unit ?? '' : unit && units.includes(unit) ? unit : lastUnit && units.includes(lastUnit) ? lastUnit : units[0];
  const valid = number(value) !== undefined && (kind !== 'blood-pressure' || number(value2) !== undefined) && (kind !== 'other' || label.trim());

  const save = () => {
    const reading: Reading = {
      id: newId(),
      kind,
      label: kind === 'other' ? label.trim() : undefined,
      value: number(value)!,
      value2: kind === 'blood-pressure' ? number(value2) : undefined,
      unit: chosenUnit,
      at: new Date(at).toISOString(),
      note: note.trim() || undefined,
    };
    readings.put(reading);
    offerUndo(`${valueText(reading)} kept`, () => readings.remove(reading.id));
    setValue('');
    setValue2('');
    setNote('');
    setAt(localNow());
  };

  return (
    <div className="page therapeia-page">
      <div className="page-top"><h1 className="title">Readings</h1></div>

      <section className="card">
        <div className="chip-row" role="group" aria-label="What">
          {KINDS.map((each) => <button key={each.id} type="button" className="chip" aria-pressed={kind === each.id} onClick={() => { setKind(each.id); setUnit(undefined); }}>{each.name}</button>)}
        </div>
        {kind === 'other' && (
          <div className="input-row">
            <label className="field"><span className="field__label">Name</span><input className="input" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Peak flow" /></label>
            <label className="field"><span className="field__label">Unit (optional)</span><input className="input" value={unit ?? ''} onChange={(event) => setUnit(event.target.value)} /></label>
          </div>
        )}
        <div className="input-row">
          <label className="field">
            <span className="field__label">{kind === 'blood-pressure' ? 'Upper (systolic)' : 'Value'}</span>
            <input className="input" inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} />
          </label>
          {kind === 'blood-pressure' && (
            <label className="field">
              <span className="field__label">Lower (diastolic)</span>
              <input className="input" inputMode="decimal" value={value2} onChange={(event) => setValue2(event.target.value)} />
            </label>
          )}
        </div>
        {kind !== 'other' && units.length > 1 && (
          <div className="chip-row" role="group" aria-label="Unit">
            {units.map((each) => <button key={each} type="button" className="chip" aria-pressed={chosenUnit === each} onClick={() => setUnit(each)}>{each}</button>)}
          </div>
        )}
        <div className="input-row">
          <label className="field"><span className="field__label">When</span><input className="input" type="datetime-local" value={at} onChange={(event) => event.target.value && setAt(event.target.value)} /></label>
          <label className="field"><span className="field__label">Note (optional)</span><input className="input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="After a walk" /></label>
        </div>
        <button type="button" className="button-main" disabled={!valid} onClick={save}>Keep</button>
      </section>

      {groups.length === 0 && <p className="muted">Readings you keep appear here, newest first.</p>}
      {groups.map((group) => {
        const sums = facts(group.readings, today);
        const before = group.readings.slice(1);
        const shown = open === group.key ? before.slice(0, 30) : before.slice(0, 3);
        return (
          <section key={group.key} className="card">
            <span className="card__eyebrow">{group.name}</span>
            <h2 className="card__title">{valueText(group.latest)}</h2>
            <p className="muted">{when(group.latest.at)}</p>
            <LineChart
              title={group.latest.kind === 'blood-pressure' ? 'Blood pressure' : `${group.name}${group.latest.unit ? `, ${group.latest.unit}` : ''}`}
              unit={group.latest.unit}
              series={group.latest.kind === 'blood-pressure' ? [{ name: 'Upper' }, { name: 'Lower' }] : [{ name: group.name }]}
              points={group.readings
                .filter((reading) => reading.unit === group.latest.unit)
                .slice(0, 60)
                .map((reading) => ({ at: new Date(reading.at).getTime(), values: reading.kind === 'blood-pressure' ? [reading.value, reading.value2] : [reading.value], label: when(reading.at) }))}
            />
            {sums && <p className="fine">Last 30 days: {sums.count} readings · lowest {sums.lowest} · highest {sums.highest} · average {sums.average}</p>}
            {group.latest.note && <p className="muted">{group.latest.note}</p>}
            <ul className="reading-list">
              {[...(group.readings.length ? [group.latest] : []), ...shown].map((reading, index) => (
                <li key={reading.id} className={index === 0 ? 'reading-list__latest' : undefined}>
                  {index > 0 && <span className="reading-list__value">{valueText(reading)}</span>}
                  {index > 0 && <span className="muted">{short(reading.at)}{reading.note ? ` · ${reading.note}` : ''}</span>}
                  <button type="button" className="text-link reading-list__remove" aria-label={`Remove ${valueText(reading)}, ${short(reading.at)}`} onClick={() => {
                    readings.remove(reading.id);
                    offerUndo('Reading removed', () => readings.put(reading));
                  }}>{index === 0 ? 'Remove this one' : 'Remove'}</button>
                </li>
              ))}
            </ul>
            {before.length > 3 && (
              <button type="button" className="text-link" onClick={() => setOpen(open === group.key ? undefined : group.key)}>{open === group.key ? 'Fewer' : `All ${group.readings.length}`}</button>
            )}
          </section>
        );
      })}
    </div>
  );
}
