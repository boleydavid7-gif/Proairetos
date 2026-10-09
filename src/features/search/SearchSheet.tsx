import { useDeferredValue, useState, useSyncExternalStore } from 'react';
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
  const [items, reflections, decisions, statements] = await Promise.all([
    lifeService.list(),
    reflectionService.all(),
    decisionService.list(),
    compassService.statements(),
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
  const [query, setQuery] = useState('');
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
          className="field-input field-input--large search-input"
          type="search"
          aria-label="Search"
          placeholder="Search what you wrote"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus
        />
        {deferred.trim() && hits.length === 0 && <p className="empty-note">Nothing matches that.</p>}
        {!deferred.trim() && <p className="sheet__hint">Things you captured, reflections, decisions, and Compass. Only on this device.</p>}
        <ul className="search-list">
          {hits.map((hit) => (
            <li key={`${hit.kind}:${hit.id}`}>
              <button
                type="button"
                className="search-row"
                onClick={() => {
                  if (hit.kind === 'item') openItem(hit.id);
                  else if (hit.kind === 'decision') openDecision(hit.id);
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
