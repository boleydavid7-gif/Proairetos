import { Empty, say } from '../../app/family/shell';
import { PillIcon, PlusIcon, PrintIcon, ShareIcon } from '../../app/family/icons';
import { toLocalDate } from '../../core/scheduling/dates';
import type { TherapeiaNav } from '../app/App';
import { useState } from 'react';
import { readings, settings, useMedicines } from '../app/state';
import PillMark from '../app/PillMark';
import { latestLines } from '../core/readings';
import { daysLeft, daysText, isCurrent, listText, timeText, type Medicine } from '../core/medicines';

function MedicineRow({ medicine, onOpen }: { medicine: Medicine; onOpen: () => void }) {
  const left = daysLeft(medicine);
  const when = [medicine.times.map(timeText).join(', '), medicine.asNeeded ? 'As needed' : undefined].filter(Boolean).join(' · ');
  return (
    <li className="chore">
      <button type="button" className="chore__open" onClick={onOpen}>
        <span className="chore__name"><PillMark look={medicine.look} size={22} />{medicine.name}{medicine.dose ? <span className="who-chip">{medicine.dose}</span> : null}</span>
        <small>{[when, medicine.times.length ? daysText(medicine.days) : undefined].filter(Boolean).join(' · ')}</small>
      </button>
      <span className="chore__when">{left !== undefined ? `${left} days left` : ''}</span>
    </li>
  );
}

export default function MedicinesPage({ nav }: { nav: TherapeiaNav }) {
  const all = useMedicines();
  const today = toLocalDate(new Date());
  const byName = [...all].sort((a, b) => a.name.localeCompare(b.name));
  const current = byName.filter((medicine) => isCurrent(medicine, today));
  const before = byName.filter((medicine) => !isCurrent(medicine, today));
  const open = (medicine: Medicine) => nav.go({ name: 'medicine', id: medicine.id });
  const card = settings.use().card;
  const kept = readings.use();
  const [withReadings, setWithReadings] = useState(false);
  const share = async () => {
    const text = listText(all, today, card, withReadings ? latestLines(kept) : []);
    try {
      if (navigator.share) await navigator.share({ title: 'Medicines', text });
      else {
        await navigator.clipboard.writeText(text);
        say('List copied');
      }
    } catch {
      // Closed without sharing.
    }
  };

  return (
    <div className="page therapeia-page">
      <div className="page-top section-head">
        <h1 className="title">Medicines</h1>
        <button type="button" className="button-main" onClick={() => nav.go({ name: 'medicine' })}><PlusIcon size={18} />Add</button>
      </div>
      {current.length ? (
        <ul className="chore-list">{current.map((medicine) => <MedicineRow key={medicine.id} medicine={medicine} onOpen={() => open(medicine)} />)}</ul>
      ) : (
        <Empty icon={<PillIcon size={26} />} title="No medicines yet" line="Each one with its times, so Today can list the doses." />
      )}
      {(card.allergies || card.conditions) && (
        <section className="card">
          {card.allergies && <p><span className="label">Allergies</span><br />{card.allergies}</p>}
          {card.conditions && <p><span className="label">Conditions</span><br />{card.conditions}</p>}
        </section>
      )}
      {current.length > 0 && (
        <div className="button-row">
          <button type="button" className="button-quiet" onClick={() => void share()}><ShareIcon size={18} />Share the list</button>
          <button type="button" className="button-quiet" onClick={() => nav.go({ name: 'print' })}><PrintIcon size={18} />Print</button>
          {kept.length > 0 && <button type="button" className="chip" aria-pressed={withReadings} onClick={() => setWithReadings(!withReadings)}>With latest readings</button>}
        </div>
      )}
      {before.length > 0 && (
        <>
          <div className="section-head"><h2>Not taking now</h2></div>
          <ul className="chore-list">{before.map((medicine) => <MedicineRow key={medicine.id} medicine={medicine} onOpen={() => open(medicine)} />)}</ul>
        </>
      )}
    </div>
  );
}
