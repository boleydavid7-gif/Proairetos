import { useMemo, useState } from 'react';
import { useLeave, useNavigate } from '../../app/navigationContext';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { compassService, decisionService, lifeService, reflectionService } from '../../app/services';
import { pursuits, type Pursuit } from '../../app/pursuits';
import type { ChosenValue } from '../../core/values/types';
import type { Decision } from '../../core/decisions/types';
import type { LifeItem } from '../../core/life-items/types';
import type { Reflection } from '../../core/reflections/types';
import PageHero from '../../components/layout/PageHero';
import { openCompassTab, openPursuit } from '../compass/CompassPage';

type Category = 'all' | 'reflections' | 'decisions' | 'pursuits' | 'life';
type View = 'active' | 'archived';
type Range = 'all' | '30' | '90' | '365';

type Connection =
  | { kind: 'reflection'; record: Reflection; archived: boolean; at: string }
  | { kind: 'decision'; record: Decision; archived: boolean; at: string }
  | { kind: 'pursuit'; record: Pursuit; archived: boolean; at: string }
  | { kind: 'life'; record: LifeItem; archived: boolean; at: string };

const categoryLabels: Record<Category, string> = {
  all: 'Everything',
  reflections: 'Reflections',
  decisions: 'Decisions',
  pursuits: 'Pursuits',
  life: 'Life',
};

function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Date unavailable';
}

function includesText(query: string, ...parts: Array<string | undefined>): boolean {
  if (!query) return true;
  return parts.some((part) => part?.toLocaleLowerCase().includes(query));
}

function linkedValueIds(entry: Connection): string[] {
  if (entry.kind === 'reflection' || entry.kind === 'life') return entry.record.valueIds ?? [];
  return Object.keys(entry.record.valueNotes ?? {});
}

function titleFor(entry: Connection): string {
  if (entry.kind === 'reflection') {
    const body = entry.record.body.trim();
    return body.length > 92 ? body.slice(0, 92).trimEnd() + '…' : body;
  }
  if (entry.kind === 'decision') return entry.record.question;
  if (entry.kind === 'pursuit') return entry.record.title;
  return entry.record.title;
}

function detailFor(entry: Connection): string {
  if (entry.kind === 'reflection') {
    const kind = entry.record.kind === 'INTENTION' ? 'Daily intention' : entry.record.kind.replaceAll('_', ' ').toLocaleLowerCase();
    return entry.record.promptKey ? kind + ' · ' + entry.record.promptKey.replaceAll('-', ' ') : kind;
  }
  if (entry.kind === 'decision') return 'Chose: ' + entry.record.choice;
  if (entry.kind === 'pursuit') {
    const status = entry.record.status === 'complete' ? 'Complete' : entry.record.status === 'paused' ? 'Paused' : entry.record.status === 'archived' ? 'Archived' : 'Active';
    return status + (entry.record.area ? ' · ' + entry.record.area : '');
  }
  const type = entry.record.type === 'DO' ? 'To do' : entry.record.type === 'REMEMBER' ? 'Remember' : entry.record.type === 'MAKE_TIME_FOR' ? 'Make time for' : entry.record.type === 'THINKING_ABOUT' ? 'Thinking about' : 'Life item';
  const status = entry.record.status === 'DONE' ? 'Done' : entry.record.status === 'WAITING' ? 'Waiting' : entry.record.status === 'LET_GO' ? 'Let go' : 'Open';
  return type + ' · ' + status;
}

function bodyFor(entry: Connection): string | undefined {
  if (entry.kind === 'reflection') return entry.record.body;
  if (entry.kind === 'decision') {
    return [entry.record.reasons, entry.record.expected ? 'Expected: ' + entry.record.expected : undefined].filter(Boolean).join('\n\n') || undefined;
  }
  if (entry.kind === 'pursuit') {
    return [entry.record.outcome, entry.record.why, entry.record.current, entry.record.nextMove ? 'Next: ' + entry.record.nextMove : undefined].filter(Boolean).join('\n\n') || undefined;
  }
  return [entry.record.notes, entry.record.location ? 'Place: ' + entry.record.location : undefined].filter(Boolean).join('\n\n') || undefined;
}

function isInRange(at: string, range: Range, now: number): boolean {
  if (range === 'all') return true;
  const stamp = new Date(at).getTime();
  return Number.isFinite(stamp) && stamp >= now - Number(range) * 86_400_000;
}

export default function ConnectionsPage() {
  const leave = useLeave('reflect');
  const navigate = useNavigate();
  const { openItem, openDecision, offerUndo } = useOverlays();
  const reflections = useServiceData(reflectionService.subscribe, () => reflectionService.all(true), []) ?? [];
  const decisions = useServiceData(decisionService.subscribe, () => decisionService.list(true), []) ?? [];
  const items = useServiceData(lifeService.subscribe, () => lifeService.listAll(true), []) ?? [];
  const values = useServiceData(compassService.subscribe, () => compassService.values(), []) ?? [];
  const allPursuits = pursuits.use();

  const [category, setCategory] = useState<Category>('all');
  const [view, setView] = useState<View>('active');
  const [range, setRange] = useState<Range>('all');
  const [valueId, setValueId] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const query = search.trim().toLocaleLowerCase();
  const valueNames = useMemo(() => new Map(values.map((value: ChosenValue) => [value.id, value.name])), [values]);

  const records: Connection[] = useMemo(() => [
    ...reflections.map((record) => ({ kind: 'reflection' as const, record, archived: Boolean(record.archivedAt), at: record.archivedAt ?? record.createdAt })),
    ...decisions.map((record) => ({ kind: 'decision' as const, record, archived: Boolean(record.archivedAt), at: record.archivedAt ?? record.decidedAt })),
    ...allPursuits.map((record) => ({ kind: 'pursuit' as const, record, archived: record.status === 'archived', at: record.updatedAt })),
    ...items.map((record) => ({ kind: 'life' as const, record, archived: Boolean(record.archivedAt), at: record.archivedAt ?? record.updatedAt })),
  ], [reflections, decisions, allPursuits, items]);

  const scoped = useMemo(() => {
    const now = Date.now();
    return records.filter((entry) => {
      if (view === 'archived' ? !entry.archived : entry.archived) return false;
      if (category !== 'all' && entry.kind !== (category === 'reflections' ? 'reflection' : category === 'decisions' ? 'decision' : category === 'pursuits' ? 'pursuit' : 'life')) return false;
      if (!isInRange(entry.at, range, now)) return false;
      if (valueId && !linkedValueIds(entry).includes(valueId)) return false;
      if (entry.kind === 'reflection') return includesText(query, entry.record.body, entry.record.kind, entry.record.promptKey);
      if (entry.kind === 'decision') return includesText(query, entry.record.question, entry.record.choice, entry.record.reasons, entry.record.expected);
      if (entry.kind === 'pursuit') return includesText(query, entry.record.title, entry.record.area, entry.record.outcome, entry.record.why, entry.record.current, entry.record.nextMove);
      return includesText(query, entry.record.title, entry.record.notes, entry.record.location, entry.record.type, entry.record.status);
    }).sort((a, b) => b.at.localeCompare(a.at));
  }, [records, view, category, range, valueId, query]);

  const counts = useMemo(() => {
    const base = records.filter((entry) => view === 'archived' ? entry.archived : !entry.archived);
    const valueScoped = valueId ? base.filter((entry) => linkedValueIds(entry).includes(valueId)) : base;
    return {
      all: valueScoped.length,
      reflections: valueScoped.filter((entry) => entry.kind === 'reflection').length,
      decisions: valueScoped.filter((entry) => entry.kind === 'decision').length,
      pursuits: valueScoped.filter((entry) => entry.kind === 'pursuit').length,
      life: valueScoped.filter((entry) => entry.kind === 'life').length,
    };
  }, [records, view, valueId]);

  async function archive(entry: Connection) {
    setBusyId(entry.kind + ':' + entry.record.id);
    setError('');
    try {
      if (entry.kind === 'reflection') {
        await reflectionService.archive(entry.record.id);
        offerUndo('Reflection archived', () => reflectionService.restore(entry.record.id).then(() => undefined));
      } else if (entry.kind === 'decision') {
        await decisionService.archive(entry.record.id);
        offerUndo('Decision archived', () => decisionService.restore(entry.record.id).then(() => undefined));
      } else if (entry.kind === 'life') {
        await lifeService.archive(entry.record.id);
        offerUndo('Life item archived', () => lifeService.restore(entry.record.id).then(() => undefined));
      } else {
        const current = entry.record;
        await pursuits.put({ ...current, status: 'archived', archivedStatus: current.status === 'archived' ? current.archivedStatus : current.status, updatedAt: new Date().toISOString() });
        offerUndo('Pursuit archived', async () => {
          const { archivedStatus: _archivedStatus, ...rest } = current;
          await pursuits.put({ ...rest, status: current.status === 'archived' ? current.archivedStatus ?? 'active' : current.status, updatedAt: new Date().toISOString() });
        });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That record could not be archived.');
    } finally {
      setBusyId('');
    }
  }

  async function restore(entry: Connection) {
    setBusyId(entry.kind + ':' + entry.record.id);
    setError('');
    try {
      if (entry.kind === 'reflection') await reflectionService.restore(entry.record.id);
      else if (entry.kind === 'decision') await decisionService.restore(entry.record.id);
      else if (entry.kind === 'life') await lifeService.restore(entry.record.id);
      else {
        const current = entry.record;
        const { archivedStatus: previous, ...rest } = current;
        await pursuits.put({ ...rest, status: previous ?? 'active', updatedAt: new Date().toISOString() });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That record could not be restored.');
    } finally {
      setBusyId('');
    }
  }

  async function unlink(entry: Connection) {
    if (!valueId) return;
    setBusyId(entry.kind + ':' + entry.record.id);
    setError('');
    try {
      if (entry.kind === 'reflection') await reflectionService.disconnectValue(entry.record.id, valueId);
      else if (entry.kind === 'decision') await decisionService.disconnectValue(entry.record.id, valueId);
      else if (entry.kind === 'life') await lifeService.disconnectValue(entry.record.id, valueId);
      else {
        const notes = { ...(entry.record.valueNotes ?? {}) };
        delete notes[valueId];
        const { valueNotes: _previous, ...rest } = entry.record;
        await pursuits.put(Object.keys(notes).length ? { ...entry.record, valueNotes: notes } : rest);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That connection could not be removed.');
    } finally {
      setBusyId('');
    }
  }

  function openRecord(entry: Connection) {
    if (entry.kind === 'reflection') {
      setExpanded((current) => ({ ...current, [entry.record.id]: !current[entry.record.id] }));
    } else if (entry.kind === 'decision') {
      openDecision(entry.record.id);
    } else if (entry.kind === 'life') {
      openItem(entry.record.id);
    } else {
      openPursuit(entry.record.id);
      openCompassTab('motion');
      navigate('compass');
    }
  }

  return (
    <div className="page connections-page">
      <PageHero title="Connections" subtitle="A place to find, revisit and organize what you have captured." back={{ label: 'Reflect', onBack: leave }} />

      <div className="connections-overview">
        <div><strong>{counts.all}</strong><span>{view === 'active' ? 'active records' : 'archived records'}</span></div>
        <p>{valueId ? 'Showing what you connected to ' + (valueNames.get(valueId) ?? 'this value') + '.' : 'Your reflections, decisions, pursuits and everyday life, together.'}</p>
      </div>

      <label className="connections-search">
        <span className="sr-only">Search all connections</span>
        <input className="field-input" type="search" aria-label="Search all connections" placeholder="Search words, ideas, decisions…" value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>

      <div className="connections-filters">
        <label>
          <span>Value</span>
          <select className="field-input" value={valueId} onChange={(event) => setValueId(event.target.value)}>
            <option value="">All values</option>
            {values.map((value: ChosenValue) => <option key={value.id} value={value.id}>{value.name}</option>)}
          </select>
        </label>
        <label>
          <span>Date</span>
          <select className="field-input" value={range} onChange={(event) => setRange(event.target.value as Range)}>
            <option value="all">Any time</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </label>
      </div>

      <div className="connections-categories" role="tablist" aria-label="Connection type">
        {(Object.keys(categoryLabels) as Category[]).map((id) => (
          <button key={id} type="button" role="tab" aria-selected={category === id} className={category === id ? 'connections-category connections-category--active' : 'connections-category'} onClick={() => setCategory(id)}>
            <span>{categoryLabels[id]}</span><small>{counts[id]}</small>
          </button>
        ))}
      </div>

      <div className="connections-view">
        <span className="daily-line__label">{view === 'active' ? 'Your library' : 'Archived'}</span>
        <div className="connections-view__switch" role="group" aria-label="Show active or archived records">
          <button type="button" aria-pressed={view === 'active'} onClick={() => setView('active')}>Active</button>
          <button type="button" aria-pressed={view === 'archived'} onClick={() => setView('archived')}>Archive</button>
        </div>
      </div>

      {error && <p className="connections-error" role="alert">{error}</p>}

      {scoped.length === 0 ? (
        <div className="connections-empty">
          <p className="connections-empty__title">{view === 'archived' ? 'Nothing archived here.' : 'Nothing matches just yet.'}</p>
          <p>{query || valueId || range !== 'all' ? 'Try changing your search or filters.' : 'As you write, decide and make connections, they will gather here.'}</p>
        </div>
      ) : (
        <ol className="connections-list">
          {scoped.map((entry) => {
            const key = entry.kind + ':' + entry.record.id;
            const names = linkedValueIds(entry).map((id) => valueNames.get(id)).filter((name): name is string => Boolean(name));
            const body = bodyFor(entry);
            const isExpanded = Boolean(expanded[entry.record.id]);
            return (
              <li key={key}>
                <article className="connections-record">
                  <div className="connections-record__meta">
                    <span className={'connections-record__kind connections-record__kind--' + entry.kind}>{entry.kind === 'life' ? 'Life' : entry.kind.charAt(0).toUpperCase() + entry.kind.slice(1)}</span>
                    <time dateTime={entry.at}>{dateLabel(entry.at)}</time>
                  </div>
                  <button type="button" className="connections-record__title" aria-expanded={entry.kind === 'reflection' ? isExpanded : undefined} onClick={() => openRecord(entry)}>
                    <span>{titleFor(entry)}</span>
                    <small>{detailFor(entry)}</small>
                  </button>
                  {entry.kind === 'reflection' && isExpanded && body && <p className="connections-record__body">{body}</p>}
                  {entry.kind !== 'reflection' && body && <p className="connections-record__body">{body}</p>}
                  {names.length > 0 && (
                    <div className="connections-record__values">
                      {names.map((name) => <span key={name}>{name}</span>)}
                    </div>
                  )}
                  <div className="connections-record__actions">
                    {valueId && linkedValueIds(entry).includes(valueId) && (
                      <button type="button" disabled={busyId === key} onClick={() => void unlink(entry)}>Unlink {valueNames.get(valueId)}</button>
                    )}
                    <button type="button" disabled={busyId === key} onClick={() => void (entry.archived ? restore(entry) : archive(entry))}>
                      {busyId === key ? 'Saving…' : entry.archived ? 'Restore' : 'Archive'}
                    </button>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
