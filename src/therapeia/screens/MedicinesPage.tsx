import { Empty, say } from '../../app/family/shell';
import IconButton from '../../components/ui/IconButton';
import { PillIcon, PlusIcon, PrintIcon, ShareIcon } from '../../app/family/icons';
import { toLocalDate } from '../../core/scheduling/dates';
import type { TherapeiaNav } from '../app/App';
import { useState } from 'react';
import { Switch } from '../../askesis/app/ui';
import { useListPermissions } from '../../app/family/sharedLists';
import { readings, settings, useCircle, useMedicines } from '../app/state';
import PillMark from '../app/PillMark';
import { latestLines } from '../core/readings';
import { daysLeft, daysText, isCurrent, listText, peopleIn, sameWho, timeText, whoOf, type Medicine } from '../core/medicines';

function MedicineRow({ medicine, onOpen }: { medicine: Medicine; onOpen: () => void }) {
  const left = daysLeft(medicine);
  const when = [medicine.times.map(timeText).join(', '), medicine.asNeeded ? 'As needed' : undefined].filter(Boolean).join(' · ');
  return (
    <li className="chore">
      <button type="button" className="chore__open" onClick={onOpen}>
        <span className="chore__name"><PillMark look={medicine.look} size={22} />{medicine.name}{whoOf(medicine) ? <span className="who-chip">{whoOf(medicine)}</span> : null}{medicine.dose ? <span className="who-chip">{medicine.dose}</span> : null}</span>
        <small>{[when, medicine.times.length ? daysText(medicine.days) : undefined].filter(Boolean).join(' · ')}</small>
      </button>
      <span className="chore__when">{left !== undefined ? `${left} days left` : ''}</span>
    </li>
  );
}

export default function MedicinesPage({ nav }: { nav: TherapeiaNav }) {
  const can = useListPermissions(useCircle()?.id);
  const everyone = useMedicines();
  const people = peopleIn(everyone);
  // With medicines for more than one person: everyone's, or one person's ('' is the person's own).
  const [whose, setWhose] = useState<string | undefined>(undefined);
  const all = whose === undefined ? everyone : everyone.filter((medicine) => sameWho(medicine, whose));
  const today = toLocalDate(new Date());
  const byName = [...all].sort((a, b) => a.name.localeCompare(b.name));
  const current = byName.filter((medicine) => isCurrent(medicine, today));
  const before = byName.filter((medicine) => !isCurrent(medicine, today));
  const open = (medicine: Medicine) => nav.go({ name: 'medicine', id: medicine.id });
  const savedCard = settings.use().card;
  const card = whose ? {} : savedCard;
  const kept = readings.use();
  const [withReadings, setWithReadings] = useState(false);
  const share = async () => {
    const text = listText(all, today, card, withReadings && !whose ? latestLines(kept) : [], whose);
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
        {can.write && <span data-header-actions><IconButton className="round-button" label="Add a medicine" onClick={() => nav.go({ name: 'medicine' })}><PlusIcon size={22} /></IconButton></span>}
      </div>
      {people.length > 0 && (
        <div className="chip-row" role="group" aria-label="Whose">
          <button type="button" className="chip" aria-pressed={whose === undefined} onClick={() => setWhose(undefined)}>Everyone</button>
          <button type="button" className="chip" aria-pressed={whose === ''} onClick={() => setWhose('')}>Me</button>
          {people.map((name) => <button key={name} type="button" className="chip" aria-pressed={whose === name} onClick={() => setWhose(name)}>{name}</button>)}
        </div>
      )}
      {current.length ? (
        <ul className="chore-list">{current.map((medicine) => <MedicineRow key={medicine.id} medicine={medicine} onOpen={() => open(medicine)} />)}</ul>
      ) : (
        <Empty icon={<PillIcon size={28} />} title="No medicines yet" />
      )}
      {current.length > 0 && (
        <ul className="rows">
          <li>
            <button type="button" className="row" onClick={() => void share()}>
              <span className="row__icon"><ShareIcon size={22} /></span>
              <span className="row__text"><span>Share the list</span></span>
            </button>
          </li>
          <li>
            <button type="button" className="row" onClick={() => nav.go({ name: 'print', who: whose })}>
              <span className="row__icon"><PrintIcon size={22} /></span>
              <span className="row__text"><span>Print</span></span>
            </button>
          </li>
          {kept.length > 0 && !whose && (
            <li className="switches">
              <Switch on={withReadings} label="With latest readings" onToggle={() => setWithReadings(!withReadings)} />
            </li>
          )}
        </ul>
      )}
      {(card.allergies || card.conditions) && (
        <ul className="rows rows--plain">
          {card.allergies && <li className="row row--aside"><span className="row__text"><span>Allergies</span></span><span className="muted">{card.allergies}</span></li>}
          {card.conditions && <li className="row row--aside"><span className="row__text"><span>Conditions</span></span><span className="muted">{card.conditions}</span></li>}
        </ul>
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
