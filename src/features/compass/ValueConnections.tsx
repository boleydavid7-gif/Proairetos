import { useState, type FormEvent } from 'react';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { decisionService, lifeService, reflectionService } from '../../app/services';
import { pursuits, type Pursuit } from '../../app/pursuits';
import type { ChosenValue } from '../../core/values/types';
import type { LifeItem } from '../../core/life-items/types';
import type { Decision } from '../../core/decisions/types';
import type { Reflection } from '../../core/reflections/types';

function dateLabel(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function itemStatus(item: LifeItem): string {
  if (item.status === 'DONE') return 'Done';
  if (item.status === 'WAITING') return 'Waiting';
  if (item.status === 'LET_GO') return 'Let go';
  return 'Open';
}

function Group({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  if (!count) return null;
  return (
    <section className="value-connections__group">
      <div className="value-connections__heading">
        <h3>{title}</h3>
        <span>{count}</span>
      </div>
      {children}
    </section>
  );
}

/** Explicit connections only: Compass never infers what a person values. */
export default function ValueConnections({
  value,
  onOpenPursuit,
}: {
  value: ChosenValue;
  onOpenPursuit: (id: string) => void;
}) {
  const { openItem, openDecision } = useOverlays();
  const items = useServiceData(lifeService.subscribe, () => lifeService.listAll(), []) ?? [];
  const decisions = useServiceData(decisionService.subscribe, () => decisionService.list(), []) ?? [];
  const reflections = useServiceData(reflectionService.subscribe, () => reflectionService.all(), []) ?? [];
  const allPursuits = pursuits.use();
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const connectedItems = items
    .filter((item) => item.valueIds?.includes(value.id))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const connectedPursuits = allPursuits
    .filter((pursuit) => Boolean(pursuit.valueNotes?.[value.id]?.trim()))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const connectedDecisions = decisions
    .filter((decision) => Boolean(decision.valueNotes?.[value.id]?.trim()))
    .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt));
  const connectedReflections = reflections
    .filter((reflection) => reflection.valueIds?.includes(value.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const total = connectedItems.length + connectedPursuits.length + connectedDecisions.length + connectedReflections.length;

  async function addReflection(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || saving) return;
    setSaving(true);
    try {
      await reflectionService.write({ body, valueIds: [value.id] });
      setDraft('');
    } finally {
      setSaving(false);
    }
  }

  function drawOnPrinciple(principle: string) {
    setDraft((current) => {
      const lines = current.split('\n').map((line) => line.trim());
      if (lines.includes(principle)) return current;
      return current.trim() ? `${current.trim()}\n${principle}` : principle;
    });
  }

  return (
    <div className="value-connections">
      <div className="value-connections__intro">
        <span className="daily-line__label">Where this shows up</span>
        <span>{total ? `${total} connection${total === 1 ? '' : 's'}` : 'Only things you connect appear here.'}</span>
      </div>

      <Group title="Life" count={connectedItems.length}>
        <ul className="value-connections__list">
          {connectedItems.slice(0, 5).map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => openItem(item.id)}>
                <span>{item.title}</span>
                <small>{itemStatus(item)}</small>
              </button>
            </li>
          ))}
        </ul>
      </Group>

      <Group title="Pursuits" count={connectedPursuits.length}>
        <ul className="value-connections__list">
          {connectedPursuits.slice(0, 5).map((pursuit: Pursuit) => (
            <li key={pursuit.id}>
              <button type="button" onClick={() => onOpenPursuit(pursuit.id)}>
                <span>{pursuit.title}</span>
                <small>{pursuit.valueNotes?.[value.id]}</small>
              </button>
            </li>
          ))}
        </ul>
      </Group>

      <Group title="Decisions" count={connectedDecisions.length}>
        <ul className="value-connections__list">
          {connectedDecisions.slice(0, 5).map((decision: Decision) => (
            <li key={decision.id}>
              <button type="button" onClick={() => openDecision(decision.id)}>
                <span>{decision.question}</span>
                <small>{decision.choice} · {dateLabel(decision.decidedAt)}</small>
              </button>
            </li>
          ))}
        </ul>
      </Group>

      <Group title="Reflections" count={connectedReflections.length}>
        <ul className="value-connections__list">
          {connectedReflections.slice(0, 5).map((reflection: Reflection) => (
            <li key={reflection.id} className="value-connections__reflection">
              <p>{reflection.body}</p>
              <small>{dateLabel(reflection.createdAt)}</small>
            </li>
          ))}
        </ul>
      </Group>

      {value.principles && value.principles.length > 0 && (
        <section className="value-connections__principles" aria-label={`Principles for ${value.name}`}>
          <span className="daily-line__label">Draw on one of your principles</span>
          <ul>
            {value.principles.map((principle) => (
              <li key={principle}>
                <button type="button" onClick={() => drawOnPrinciple(principle)}>
                  <span>{principle}</span>
                  <small>Add to reflection</small>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <form className="value-connections__form" onSubmit={addReflection}>
        <label className="daily-line__label" htmlFor={`value-reflection-${value.id}`}>Add a reflection about {value.name.toLowerCase()}</label>
        <textarea
          id={`value-reflection-${value.id}`}
          className="field-input field-input--area"
          rows={2}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" className="chip chip--small" disabled={!draft.trim() || saving}>
          {saving ? 'Saving…' : 'Save reflection'}
        </button>
      </form>
    </div>
  );
}
