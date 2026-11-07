import { useState } from 'react';
import { PrintPart, PrintSheet, PrintTable } from '../../app/family/PrintSheet';
import { parseLocalDate, toLocalDate } from '../../core/scheduling/dates';
import type { KtemaNav } from '../app/App';
import { settings, things, upkeeps } from '../app/state';
import { CATEGORIES, everyText, nextDue, type Category, type Thing } from '../core/things';
import { byRoom, moneyText, thingsCsv, totalOf } from '../core/insurance';

const day = (date?: string) => (date ? parseLocalDate(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : undefined);

function download(name: string, text: string) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  link.download = name;
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

const totalText = (list: readonly Thing[], withUnpriced = false) => {
  const { totals, unpriced } = totalOf(list);
  return [totals.map(moneyText).join(' + '), withUnpriced && unpriced ? `${unpriced} without a price` : undefined].filter(Boolean).join(' · ') || '–';
};

/** For an insurer: room by room, with what each thing cost and the totals. */
function InsuranceSheet({ nav, onKinds }: { nav: KtemaNav; onKinds: () => void }) {
  const all = things.use();
  const rooms = byRoom(all);
  return (
    <PrintSheet
      title="Insurance list"
      onBack={nav.back}
      choices={
        <>
          <button type="button" className="chip" onClick={onKinds}>By kind</button>
          <button type="button" className="chip" aria-pressed="true">By room, with prices</button>
          {all.length > 0 && <button type="button" className="chip" onClick={() => download(`ktema-things-${toLocalDate(new Date())}.csv`, thingsCsv(all))}>Download (CSV)</button>}
        </>
      }
    >
      {all.length === 0 && <p>No things yet.</p>}
      {rooms.map(([room, list]) => (
        <PrintPart key={room} title={room}>
          <PrintTable
            columns={['Thing', 'Make and model', 'Serial', 'Bought', 'Price']}
            rows={[...list.map((thing) => [thing.name, [thing.make, thing.model].filter(Boolean).join(' '), thing.serial, day(thing.boughtOn), thing.price]), ['Room total', undefined, undefined, undefined, totalText(list)]]}
          />
        </PrintPart>
      ))}
      {(rooms.length > 1 || totalOf(all).unpriced > 0) && all.length > 0 && <p className="print-total">All rooms: {totalText(all, true)}</p>}
      <p className="print-note">From Ktema. Prices as paid; photos and receipts are kept on the device with each thing.</p>
    </PrintSheet>
  );
}

export default function PrintPage({ nav, insurance = false }: { nav: KtemaNav; insurance?: boolean }) {
  const [byRoomShown, setByRoomShown] = useState(insurance);
  if (byRoomShown) return <InsuranceSheet nav={nav} onKinds={() => setByRoomShown(false)} />;
  return <KindsSheet nav={nav} onRooms={() => setByRoomShown(true)} />;
}

/** What is owned, on paper: for a move, or the drawer with the manuals. */
function KindsSheet({ nav, onRooms }: { nav: KtemaNav; onRooms: () => void }) {
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
          {all.length > 0 && <button type="button" className="chip" onClick={onRooms}>By room, with prices</button>}
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
