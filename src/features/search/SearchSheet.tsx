import { people } from '../../philia/app/state';
import { allChores } from '../../ergon/app/state';
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
import { search, type Searchable } from '../../core/search/search';
import { dayLabel } from '../reflect/format';
import { promptText } from '../reflect/prompts';

const statementLabels: Record<string, string> = {
  REMEMBER: 'Worth getting up for',
  PUSHED_ASIDE: 'Put aside',
  PERSON: 'Person',
  GOAL: 'Goal',
};

function subscribeAll(listener: () => void) {
  const off = [lifeService, reflectionService, decisionService, compassService].map((service) => service.subscribe(listener));
  return () => off.forEach((unsubscribe) => unsubscribe());
}

async function gather(): Promise<{ things: Searchable[]; labels: Map<string, string> }> {
  const [items, reflections, decisions, statements, recipes, books, bills] = await Promise.all([
    lifeService.list(),
    reflectionService.all(),
    decisionService.list(),
    compassService.statements(),
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
    things.push({ id: statement.id, kind: 'statement', title: statement.body, fields: [{ name: 'Note', text: statement.note }], at: statement.createdAt });
  }
  // What the other apps hold, read only, so one search finds it all.
  for (const recipe of recipes) {
    labels.set(recipe.id, 'Recipe in SOMA');
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
  for (const book of books) {
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
  for (const bill of bills) {
    labels.set(bill.id, 'Bill in Oikonomia');
    things.push({ id: bill.id, kind: 'app', href: '/oikonomia/', title: bill.name, fields: [{ name: 'Notes', text: bill.notes }], at: bill.createdAt });
  }
  for (const person of people.list()) {
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
  for (const chore of allChores()) {
    labels.set(chore.id, 'Chore in Ergon');
    things.push({ id: chore.id, kind: 'app', href: `/ergon/?open=${encodeURIComponent(`chore:${chore.id}`)}`, title: chore.name, fields: [{ name: 'Room', text: chore.room }, { name: 'Note', text: chore.note }], at: chore.createdAt });
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
  // The sheet opens after this renders, so the field is focused once it is showing.
  useEffect(() => field.current?.focus(), []);
  const [openEntry, setOpenEntry] = useState<string | null>(null);
  const deferred = useDeferredValue(query);
  const data = useServiceData(subscribeAll, gather);
  const reflections = useServiceData(reflectionService.subscribe, () => reflectionService.all()) ?? [];
  const locked = useSyncExternalStore(lock.subscribe, lock.isLocked);
  // While the lock is on, what was written in Reflect stays out of search.
  const hits = data ? search(deferred, data.things).filter((hit) => !(locked && hit.kind === 'reflection')) : [];

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
          placeholder="Search what you wrote"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {deferred.trim() && hits.length === 0 && <p className="empty-note">Nothing matches that.</p>}
        {!deferred.trim() && <p className="sheet__hint">Things you captured, reflections, decisions, and Compass, plus recipes, books and bills from the other apps. Only on this device.</p>}
        <ul className="search-list">
          {hits.map((hit) => (
            <li key={`${hit.kind}:${hit.id}`}>
              <button
                type="button"
                className="search-row"
                onClick={() => {
                  if (hit.kind === 'item') openItem(hit.id);
                  else if (hit.kind === 'decision') openDecision(hit.id);
                  else if (hit.kind === 'app' && hit.href) window.location.assign(hit.href);
                  else if (hit.kind === 'reflection') setOpenEntry(openEntry === hit.id ? null : hit.id);
                  else {
                    close();
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
