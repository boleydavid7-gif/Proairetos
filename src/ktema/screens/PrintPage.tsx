import { useState } from 'react';
import { PrintPart, PrintSheet, PrintTable } from '../../app/family/PrintSheet';
import { parseLocalDate } from '../../core/scheduling/dates';
import type { KtemaNav } from '../app/App';
import { settings, things, upkeeps } from '../app/state';
import { CATEGORIES, everyText, nextDue, type Category } from '../core/things';

const day = (date?: string) => (date ? parseLocalDate(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : undefined);

/** What is owned, on paper: for insurance, a move, or the drawer with the manuals. */
export default function PrintPage({ nav }: { nav: KtemaNav }) {
  const all = things.use();
  const kept = upkeeps.use();
  const unit = settings.use().distance;
  const present = CATEGORIES.filter((category) => all.some((thing) => thing.category === category));
  const [only, setOnly] = useState<Category | null>(null);
  const [withUpkeep, setWithUpkeep] = useState(false);
  const shown = present.filter((category) => !only || category === only);
  const inShown = (thingId?: string) => {
    const thing = all.find((each) => each.id === thingId);
    return thing ? shown.includes(thing.category) : !only;
  };

  return (
    <PrintSheet
      title={only ? `Things: ${only}` : 'Things'}
      onBack={nav.back}
      choices={
        <>
          {present.length > 1 && (
            <>
              <button type="button" className="chip" aria-pressed={!only} onClick={() => setOnly(null)}>All</button>
              {present.map((category) => <button key={category} type="button" className="chip" aria-pressed={only === category} onClick={() => setOnly(category)}>{category}</button>)}
            </>
          )}
          {kept.length > 0 && <button type="button" className="chip" aria-pressed={withUpkeep} onClick={() => setWithUpkeep(!withUpkeep)}>Upkeep</button>}
        </>
      }
    >
      {all.length === 0 && <p>No things yet.</p>}
      {shown.map((category) => (
        <PrintPart key={category} title={category}>
          <PrintTable
            columns={['Thing', 'Make and model', 'Serial', 'Bought', 'Price', 'Store', category === 'Documents' ? 'Renew by' : 'Warranty until', 'Place']}
            rows={all
              .filter((thing) => thing.category === category)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((thing) => [thing.name, [thing.make, thing.model].filter(Boolean).join(' '), thing.serial, day(thing.boughtOn), thing.price, thing.store, day(thing.warrantyUntil), thing.place])}
          />
        </PrintPart>
      ))}
      {withUpkeep && (
        <PrintPart title="Upkeep">
          <PrintTable
            columns={['Upkeep', 'For', 'How often', 'Last done', 'Next']}
            rows={kept
              .filter((upkeep) => inShown(upkeep.thingId))
              .map((upkeep) => {
                const thing = all.find((each) => each.id === upkeep.thingId);
                const due = nextDue(upkeep, thing);
                const often = [everyText(upkeep.every), upkeep.distance ? `${upkeep.distance.toLocaleString()} ${unit}` : undefined].filter(Boolean).join(' or ');
                const last = upkeep.history.filter((done) => !done.skipped).sort((a, b) => a.date.localeCompare(b.date)).at(-1);
                return { due, row: [upkeep.name, thing?.name, often, day(last?.date), day(due.date)] };
              })
              .sort((a, b) => a.due.date.localeCompare(b.due.date))
              .map((each) => each.row)}
          />
        </PrintPart>
      )}
      <p className="print-note">From Ktema.</p>
    </PrintSheet>
  );
}
