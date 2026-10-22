import { useEffect, useState } from 'react';
import { isAdded } from '../../app/family/added';
import { offerUndo } from '../../app/family/shell';
import { newId, nowStamp, packing } from '../app/state';
import { datesText } from '../app/ui';
import type { Trip } from '../core/model';

type Connections = typeof import('../app/connections');

/**
 * The trip with the person's other apps, each shown only when added: Phyton's away dates, and Therapeia's medicines with
 * the doses the days take, offered for the packing list. Nothing is changed until asked, and each change has undo.
 */
export default function TripWithApps({ trip }: { trip: Trip }) {
  const plants = isAdded('phyton');
  const care = isAdded('therapeia');
  const [apps, setApps] = useState<Connections>();
  const [, redraw] = useState(0);
  useEffect(() => {
    if (plants || care) void import('../app/connections').then(setApps);
  }, [plants, care]);
  const packed = packing.use().filter((each) => each.tripId === trip.id);
  if (!apps || !trip.start) return null;

  const away = plants ? apps.plantsAway(trip) : undefined;
  const medicines = care ? apps.medicinesFor(trip).filter((medicine) => !packed.some((item) => item.name.startsWith(medicine.name))) : [];
  if (!plants && !medicines.length) return null;

  const packMedicines = () => {
    const added = medicines.map((medicine) => ({ id: newId(), tripId: trip.id, name: medicine.doses ? `${medicine.name} · ${medicine.doses} ${medicine.doses === 1 ? 'dose' : 'doses'}` : medicine.name, packed: false, group: 'health' as const, createdAt: nowStamp() }));
    added.forEach((item) => packing.put(item));
    offerUndo(`${added.length} ${added.length === 1 ? 'medicine' : 'medicines'} added to packing`, () => added.forEach((item) => packing.remove(item.id)));
  };

  return (
    <section className="card">
      <h2 className="card__title">With your apps</h2>
      <ul className="poreia-with-list">
        {plants && (
          <li className="poreia-with">
            <span className="poreia-with__text">
              <span>Plants in Phyton</span>
              <span className="muted">{away === 'same' ? `Away ${datesText(trip.start, trip.end)}: reminders wait, and one says what came round when you’re back` : 'Away dates hold plant reminders while you’re gone'}</span>
            </span>
            {away !== 'same' && (
              <button
                type="button"
                className="button-quiet"
                onClick={() => {
                  const undo = apps.setPlantsAway(trip);
                  redraw((count) => count + 1);
                  offerUndo('Phyton’s away dates set', () => {
                    undo();
                    redraw((count) => count + 1);
                  });
                }}
              >
                Set away
              </button>
            )}
          </li>
        )}
        {medicines.length > 0 && (
          <li className="poreia-with">
            <span className="poreia-with__text">
              <span>Medicines from Therapeia</span>
              <span className="muted">{medicines.map((medicine) => (medicine.doses ? `${medicine.name} (${medicine.doses})` : medicine.name)).join(', ')}</span>
            </span>
            <button type="button" className="button-quiet" onClick={packMedicines}>
              Add to packing
            </button>
          </li>
        )}
      </ul>
    </section>
  );
}
