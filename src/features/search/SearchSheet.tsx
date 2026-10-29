import { people } from '../../philia/app/state';
import { isAdded } from '../../app/family/added';
import { allChores } from '../../ergon/app/state';
import { appointments as therapeiaVisits, allMedicines as therapeiaMedicines } from '../../therapeia/app/state';
import { withWho } from '../../therapeia/core/medicines';
import { things as ktemaThings, upkeeps as ktemaUpkeeps } from '../../ktema/app/state';
import { allPlants } from '../../phyton/app/state';
import { speciesBy } from '../../phyton/core/species';
import { bookings as poreiaBookings, plans as poreiaPlans, trips as poreiaTrips } from '../../poreia/app/state';
import { kindLabel as bookingKindLabel } from '../../poreia/core/model';
import { useDeferredValue, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { readStore } from '../../app/family/read';
import type { Recipe } from '../../soma/core/recipes';
import type { TheoriaBook } from '../../theoria/core/books';
import type { Bill } from '../../oikonomia/core/bills';
import { lock } from '../../app/lock/lock';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useNavigate } from '../../app/navigationContext';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { compassService, decisionService, lifeService, reflectionService } from '../../app/services';
import { useSheet } from '../../components/ui/useSheet';
import { kindLabel, kindOf } from '../../core/life-items/kinds';
import { inSearchScope, search, type Searchable, type SearchScope } from '../../core/search/search';
import { dayLabel } from '../reflect/format';
import { promptText } from '../reflect/prompts';
import { pursuits } from '../../app/pursuits';
import { openCompassTab } from '../compass/CompassPage';
import { openPursuit } from '../compass/PursuitsSection';

const statementLabels: Record<string, string> = {
  REMEMBER: 'Worth getting up for',
  PUSHED_ASIDE: 'Put aside',
  PERSON: 'Person',
  GOAL: 'Pursuit',
};

/** Where a Compass result opens: its own tab, and a pursuit itself. */
const compassPlaces = new Map<string, { tab: 'direction' | 'motion' | 'close'; pursuitId?: string }>();
const tabForStatement = (type: string) => (type === 'GOAL' ? 'motion' : type === 'PERSON' || type === 'REMEMBER' || type === 'PUSHED_ASIDE' ? 'close' : 'direction');

function subscribeAll(listener: () => void) {
  const off = [lifeService, reflectionService, decisionService, compassService].map((service) => service.subscribe(listener));
  return () => off.forEach((unsubscribe) => unsubscribe());
}

async function gather(): Promise<{ things: Searchable[]; labels: Map<string, string> }> {
  const [items, reflections, decisions, statements, values, recipes, books, bills] = await Promise.all([
    lifeService.list(),
    reflectionService.all(),
    decisionService.list(),
    compassService.statements(),
    compassService.values(),
    readStore<Recipe>('somaRecipes'),
    readStore<TheoriaBook>('theoriaBooks'),
    readStore<Bill>('oikonomiaBills'),
  ]);
  const labels = new Map<string, string>();
  const things: Searchable[] = [];
  for (const item of items) {
    const status = item.status === 'DONE' ? 'Done' : item.status === 'LET_GO' ? 'Let go' : undefined;
    labels.set(item.id, [kindLabel(kindOf(item)) ?? 'Not sorted', status].filter(Boolean).join(' · '));
    things.push({
      id: item.id,
      kind: 'item',
      title: item.title,
      fields: [
        { name: 'Notes', text: item.notes },
        { name: 'Next step', text: item.nextStep },
        { name: 'Where', text: item.location },
        { name: 'List', text: item.checklist?.map((line) => line.text).join('\n') },
        { name: 'Up to you', text: item.controlSplit?.inMyControl.join('\n') },
        { name: 'Not up to you', text: item.controlSplit?.notInMyControl.join('\n') },
        { name: 'If something gets in the way', text: item.ifObstacle },
      ],
      at: item.createdAt,
    });
  }
  for (const entry of reflections) {
    if (entry.kind === 'INTENTION') continue;
    labels.set(entry.id, `Reflection · ${dayLabel(entry.createdAt)}`);
    things.push({
      id: entry.id,
      kind: 'reflection',
      title: promptText(entry.promptKey) ?? 'Reflection',
      fields: [{ name: 'Entry', text: entry.body }],
      at: entry.createdAt,
    });
  }
  for (const decision of decisions) {
    labels.set(decision.id, `Decision · ${dayLabel(decision.decidedAt)}`);
    things.push({
      id: decision.id,
      kind: 'decision',
      title: decision.question,
      fields: [
        { name: 'Chose', text: decision.choice },
        { name: 'Options', text: decision.options.join('\n') },
        { name: 'Why', text: decision.reasons },
      ],
      at: decision.decidedAt,
    });
  }
  for (const statement of statements) {
    labels.set(statement.id, statementLabels[statement.type] ?? 'Compass');
    compassPlaces.set(statement.id, { tab: tabForStatement(statement.type) });
    things.push({ id: statement.id, kind: 'statement', title: statement.body, fields: [{ name: 'Note', text: statement.note }], at: statement.createdAt });
  }
  // Values are Compass's Direction: a result opens that tab.
  for (const value of values) {
    labels.set(value.id, 'Direction');
    compassPlaces.set(value.id, { tab: 'direction' });
    things.push({ id: value.id, kind: 'statement', title: value.name, fields: [{ name: 'Meaning', text: value.meaning }], at: value.chosenAt });
  }
  // Pursuits sit with Compass: a result opens that pursuit in In motion.
  for (const pursuit of pursuits.list()) {
    labels.set(pursuit.id, 'Pursuit');
    compassPlaces.set(pursuit.id, { tab: 'motion', pursuitId: pursuit.id });
    things.push({
      id: pursuit.id,
      kind: 'statement',
      title: pursuit.title,
      fields: [
        { name: 'Next move', text: pursuit.nextMove },
        { name: 'Outcome', text: pursuit.outcome },
        { name: 'Area', text: pursuit.area },
      ],
      at: pursuit.createdAt,
    });
  }
  // What the other apps hold, read only, so one search finds it all.
  for (const recipe of isAdded('soma') ? recipes : []) {
    labels.set(recipe.id, 'Recipe in Soma');
    things.push({
      id: recipe.id,
      kind: 'app',
      href: '/soma/',
      title: recipe.title,
      fields: [
        { name: 'Ingredients', text: recipe.ingredients.join('\n') },
        { name: 'Notes', text: recipe.notes },
        { name: 'Tags', text: recipe.tags.join(' ') },
      ],
      at: recipe.createdAt ?? '',
    });
  }
  for (const book of isAdded('theoria') ? books : []) {
    labels.set(book.id, 'Book in Theoria');
    things.push({
      id: book.id,
      kind: 'app',
      href: '/theoria/',
      title: book.title,
      fields: [
        { name: 'Author', text: book.author },
        { name: 'Highlights', text: book.highlights.map((highlight) => highlight.text).join('\n') },
        { name: 'Notes', text: book.notes.map((note) => note.body).join('\n') },
      ],
      at: book.updatedAt,
    });
  }
  for (const bill of isAdded('oikonomia') ? bills : []) {
    labels.set(bill.id, 'Bill in Oikonomia');
    things.push({ id: bill.id, kind: 'app', href: '/oikonomia/', title: bill.name, fields: [{ name: 'Notes', text: bill.notes }], at: bill.createdAt });
  }
  for (const person of isAdded('philia') ? people.list() : []) {
    labels.set(person.id, 'Person in Philia');
    things.push({
      id: person.id,
      kind: 'app',
      href: `/philia/?open=${encodeURIComponent(`person:${person.id}`)}`,
      title: person.name,
      fields: [
        { name: 'Who', text: person.relation },
        { name: 'Remember', text: person.notes.map((note) => note.text).join('\n') },
        { name: 'Gift ideas', text: person.gifts.map((gift) => gift.text).join('\n') },
        { name: 'Times together', text: person.times.map((time) => time.text).join('\n') },
      ],
      at: person.createdAt,
    });
  }
  for (const chore of isAdded('ergon') ? allChores() : []) {
    labels.set(chore.id, 'Chore in Ergon');
    things.push({ id: chore.id, kind: 'app', href: `/ergon/?open=${encodeURIComponent(`chore:${chore.id}`)}`, title: chore.name, fields: [{ name: 'Room', text: chore.room }, { name: 'Note', text: chore.note }], at: chore.createdAt });
  }
  for (const medicine of isAdded('therapeia') ? therapeiaMedicines() : []) {
    labels.set(medicine.id, 'Medicine in Therapeia');
    things.push({ id: medicine.id, kind: 'app', href: `/therapeia/?open=${encodeURIComponent(`medicine:${medicine.id}`)}`, title: withWho(medicine, medicine.name), fields: [{ name: 'Dose', text: medicine.dose }, { name: 'Note', text: medicine.note }], at: medicine.createdAt });
  }
  for (const visit of isAdded('therapeia') ? therapeiaVisits.list() : []) {
    labels.set(visit.id, 'Visit in Therapeia');
    things.push({ id: visit.id, kind: 'app', href: `/therapeia/?open=${encodeURIComponent(`visit:${visit.id}`)}`, title: withWho(visit, visit.with), fields: [{ name: 'Where', text: visit.where }, { name: 'Notes', text: visit.notes }, { name: 'To ask', text: visit.questions.map((each) => each.text).join('\n') }], at: visit.createdAt });
  }
  for (const thing of isAdded('ktema') ? ktemaThings.list() : []) {
    labels.set(thing.id, 'In Ktema');
    things.push({ id: thing.id, kind: 'app', href: `/ktema/?open=${encodeURIComponent(`thing:${thing.id}`)}`, title: thing.name, fields: [{ name: 'Make', text: [thing.make, thing.model].filter(Boolean).join(' ') }, { name: 'Serial', text: thing.serial }, { name: 'Where', text: thing.place }, { name: 'Note', text: thing.note }], at: thing.createdAt });
  }
  for (const upkeep of isAdded('ktema') ? ktemaUpkeeps.list() : []) {
    labels.set(upkeep.id, 'Upkeep in Ktema');
    things.push({ id: upkeep.id, kind: 'app', href: `/ktema/?open=${encodeURIComponent(`upkeep:${upkeep.id}`)}`, title: upkeep.name, fields: [{ name: 'Note', text: upkeep.note }], at: upkeep.createdAt });
  }
  for (const plant of isAdded('phyton') ? allPlants() : []) {
    labels.set(plant.id, 'Plant in Phyton');
    const type = speciesBy(plant.species);
    things.push({ id: plant.id, kind: 'app', href: `/phyton/?open=${encodeURIComponent(`plant:${plant.id}`)}`, title: plant.name, fields: [{ name: 'Type', text: [type?.name, plant.latin ?? type?.latin].filter(Boolean).join(' ') }, { name: 'Where', text: plant.place }, { name: 'Note', text: plant.note }], at: plant.createdAt });
  }
  if (isAdded('poreia')) {
    const tripNames = new Map(poreiaTrips.list().map((trip) => [trip.id, trip.name]));
    for (const trip of poreiaTrips.list()) {
      labels.set(trip.id, 'Trip in Poreia');
      things.push({ id: trip.id, kind: 'app', href: `/poreia/?open=${encodeURIComponent(`trip:${trip.id}`)}`, title: trip.name, fields: [{ name: 'Where', text: trip.place?.label ?? trip.place?.name }, { name: 'Note', text: trip.notes }], at: trip.createdAt });
    }
    for (const booking of poreiaBookings.list()) {
      labels.set(booking.id, `${bookingKindLabel(booking.kind)} in ${tripNames.get(booking.tripId) ?? 'Poreia'}`);
      things.push({ id: booking.id, kind: 'app', href: `/poreia/?open=${encodeURIComponent(`booked:${booking.id}`)}`, title: booking.title, fields: [{ name: 'With', text: booking.provider }, { name: 'Confirmation', text: booking.confirmation }, { name: 'Where', text: [booking.address, booking.from, booking.to].filter(Boolean).join(' ') }, { name: 'Note', text: booking.notes }], at: booking.createdAt });
    }
    for (const item of poreiaPlans.list()) {
      labels.set(item.id, `Plan in ${tripNames.get(item.tripId) ?? 'Poreia'}`);
      things.push({ id: item.id, kind: 'app', href: `/poreia/?open=${encodeURIComponent(`plan:${item.id}`)}`, title: item.title, fields: [{ name: 'Where', text: item.where }, { name: 'Note', text: item.note }], at: item.createdAt });
    }
  }
  return { things, labels };
}

/**
 * Find anything written down: items, reflections, decisions, and Compass.
 * All on the device; nothing typed here is kept or sent anywhere.
 */
export default function SearchSheet({ onClose }: { onClose: () => void }) {
  const { dialog, panel, close } = useSheet();
  const { openItem, openDecision } = useOverlays();
  const navigate = useNavigate();
  const field = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>('all');
  // The sheet opens after this renders, so the field is focused once it is showing.
  useEffect(() => field.current?.focus(), []);
  const [openEntry, setOpenEntry] = useState<string | null>(null);
  const deferred = useDeferredValue(query);
  const data = useServiceData(subscribeAll, gather);
  const reflections = useServiceData(reflectionService.subscribe, () => reflectionService.all()) ?? [];
  const locked = useSyncExternalStore(lock.subscribe, lock.isLocked);
  // While the lock is on, what was written in Reflect stays out of search.
  const hits = data
    ? search(deferred, data.things).filter(
        (hit) => !(locked && hit.kind === 'reflection') && inSearchScope(hit, scope),
      )
    : [];
  const scopes: { id: SearchScope; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'items', label: 'Items' },
    { id: 'reflections', label: 'Reflections' },
    { id: 'decisions', label: 'Decisions' },
    { id: 'compass', label: 'Compass' },
    { id: 'apps', label: 'Other apps' },
  ];

  return (
    <dialog
      ref={dialog}
      className="sheet sheet--tall"
      aria-label="Search"
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && close()}
    >
      <div ref={panel} className="sheet__panel">
        <div className="sheet__grabber" aria-hidden="true" />
        <button type="button" className="sheet__close" onClick={close}>
          Close
        </button>
        <input
          ref={field}
          className="field-input field-input--large search-input"
          type="search"
          aria-label="Search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="search-scope" role="tablist" aria-label="Search in">
          {scopes.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={scope === option.id}
              className="chip chip--small"
              onClick={() => setScope(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {deferred.trim() && hits.length === 0 && <p className="empty-note">Nothing matches that.</p>}
        <ul className="search-list">
          {hits.map((hit) => (
            <li key={`${hit.kind}:${hit.id}`}>
              <button
                type="button"
                className="search-row"
                onClick={() => {
                  // The search closes first, so back from what it opened returns to the page, not to the search.
                  if (hit.kind === 'item') {
                    close();
                    openItem(hit.id);
                  } else if (hit.kind === 'decision') {
                    close();
                    openDecision(hit.id);
                  }
                  else if (hit.kind === 'app' && hit.href) window.location.assign(hit.href);
                  else if (hit.kind === 'reflection') setOpenEntry(openEntry === hit.id ? null : hit.id);
                  else {
                    close();
                    const place = compassPlaces.get(hit.id);
                    openCompassTab(place?.tab ?? 'direction');
                    if (place?.pursuitId) openPursuit(place.pursuitId);
                    navigate('compass');
                  }
                }}
              >
                <span className="search-row__label">{data?.labels.get(hit.id)}</span>
                <span className="search-row__title">{hit.title}</span>
                {hit.kind === 'reflection' && openEntry === hit.id ? (
                  <span className="search-row__full">{reflections.find((entry) => entry.id === hit.id)?.body}</span>
                ) : (
                  hit.snippet && <span className="search-row__snippet">{hit.snippet}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  );
}
