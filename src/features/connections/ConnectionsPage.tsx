import { useEffect, useMemo, useState } from 'react';
import { useLeave, useNavigate } from '../../app/navigationContext';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { compassService, decisionService, lifeService, reflectionService } from '../../app/services';
import { pursuits } from '../../app/pursuits';
import { useRuns } from '../../app/askesis/runs';
import { combineReadingSessions, useStudy } from '../../app/praxis/study';
import { cookedForBetween, useRecipesFromSoma } from '../../app/soma/meals';
import { linkTo } from '../../app/family/opening';
import { libraryFavorites, setLibraryFavorite } from '../../app/library/favorites';
import { buildLifeRecords, type LifeRecord, type LifeRecordKind } from '../../core/life-records';
import type { ChosenValue } from '../../core/values/types';
import type { Decision } from '../../core/decisions/types';
import type { LifeItem } from '../../core/life-items/types';
import type { Reflection } from '../../core/reflections/types';
import PageHero from '../../components/layout/PageHero';
import { Sym } from '../../lamplight/icons';
import { openCompassTab } from '../compass/CompassPage';
import { openPursuit } from '../compass/PursuitsSection';

type Category = 'all' | 'reflections' | 'decisions' | 'experiences' | 'pursuits' | 'life';
type View = 'library' | 'saved' | 'archived';
type Range = 'all' | '30' | '90' | '365';
type SortOrder = 'newest' | 'oldest';

const categoryLabels: Record<Category, string> = {
  all: 'Everything',
  reflections: 'Reflections',
  decisions: 'Decisions',
  experiences: 'Experiences',
  pursuits: 'Pursuits',
  life: 'Life',
};

const kindLabels: Record<LifeRecordKind, string> = {
  reflection: 'Reflection',
  decision: 'Decision',
  pursuit: 'Pursuit',
  life: 'Life',
  workout: 'Workout',
  meal: 'Meal',
  study: 'Study',
};

function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Date unavailable';
}

function isInRange(at: string, range: Range, now: number): boolean {
  if (range === 'all') return true;
  const stamp = new Date(at).getTime();
  return Number.isFinite(stamp) && stamp >= now - Number(range) * 86_400_000;
}

function categoryMatches(record: LifeRecord, category: Category): boolean {
  if (category === 'all') return true;
  if (category === 'reflections') return record.kind === 'reflection';
  if (category === 'decisions') return record.kind === 'decision';
  if (category === 'experiences') return record.kind === 'workout' || record.kind === 'meal' || record.kind === 'study';
  if (category === 'pursuits') return record.kind === 'pursuit';
  return record.kind === 'life';
}

function hrefFor(record: LifeRecord): string | undefined {
  if (record.kind === 'workout') return linkTo('askesis', 'entry:' + record.sourceId);
  if (record.kind === 'meal') return linkTo('soma', 'recipe:' + record.sourceId);
  if (record.kind === 'study') return '/theoria/?open=pomodoro:sessions';
  return undefined;
}

function linkedValueIds(record: LifeRecord): string[] {
  return record.valueIds;
}

function canArchive(record: LifeRecord): boolean {
  return record.kind === 'reflection' || record.kind === 'decision' || record.kind === 'pursuit' || record.kind === 'life';
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
  const runs = useRuns();
  const recipes = useRecipesFromSoma();
  const study = useStudy();
  const favorites = libraryFavorites.use();

  const [category, setCategory] = useState<Category>('all');
  const [view, setView] = useState<View>('library');
  const [range, setRange] = useState<Range>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [valueId, setValueId] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingKey, setEditingKey] = useState('');
  const [editBody, setEditBody] = useState('');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [visibleCount, setVisibleCount] = useState(30);

  const favoriteKeys = useMemo(() => new Set(favorites.map((favorite) => favorite.id)), [favorites]);
  const records = useMemo(() => buildLifeRecords({
    reflections,
    decisions,
    pursuits: allPursuits,
    items,
    workouts: runs?.workouts ?? [],
    recipes: cookedForBetween(recipes, '0000-01-01', '9999-12-31').length
      ? recipes
      : recipes,
    studySessions: combineReadingSessions(study?.sessions ?? []),
  }), [reflections, decisions, allPursuits, items, runs, recipes, study]);

  const query = search.trim().toLocaleLowerCase();
  const hasFilters = Boolean(query || category !== 'all' || valueId || range !== 'all' || sortOrder !== 'newest');
  const valueNames = useMemo(() => new Map<string, string>(values.map((value: ChosenValue) => [value.id, value.name] as const)), [values]);

  const scoped = useMemo(() => {
    const now = Date.now();
    return records.filter((record) => {
      if (view === 'archived' ? !record.archived : record.archived) return false;
      if (view === 'saved' && !favoriteKeys.has(record.key)) return false;
      if (!categoryMatches(record, category)) return false;
      if (!isInRange(record.at, range, now)) return false;
      if (valueId && !linkedValueIds(record).includes(valueId)) return false;
      if (query && !record.searchText.includes(query)) return false;
      return true;
    }).sort((a, b) => sortOrder === 'newest' ? b.at.localeCompare(a.at) : a.at.localeCompare(b.at));
  }, [records, view, category, range, sortOrder, valueId, query, favoriteKeys]);

  const libraryCount = records.filter((record) => !record.archived).length;
  const savedCount = records.filter((record) => !record.archived && favoriteKeys.has(record.key)).length;
  const archivedCount = records.filter((record) => record.archived).length;

  useEffect(() => setVisibleCount(30), [category, view, range, sortOrder, valueId, query]);
  const visibleRecords = scoped.slice(0, visibleCount);

  async function archive(record: LifeRecord) {
    setBusyId(record.key);
    setError('');
    try {
      if (record.kind === 'reflection') {
        await reflectionService.archive(record.sourceId);
        offerUndo('Reflection archived', () => reflectionService.restore(record.sourceId).then(() => undefined));
      } else if (record.kind === 'decision') {
        await decisionService.archive(record.sourceId);
        offerUndo('Decision archived', () => decisionService.restore(record.sourceId).then(() => undefined));
      } else if (record.kind === 'life') {
        await lifeService.archive(record.sourceId);
        offerUndo('Life item archived', () => lifeService.restore(record.sourceId).then(() => undefined));
      } else if (record.kind === 'pursuit') {
        const current = allPursuits.find((entry) => entry.id === record.sourceId);
        if (!current) throw new Error('That pursuit no longer exists.');
        await pursuits.put({ ...current, status: 'archived', archivedStatus: current.status === 'archived' ? current.archivedStatus : current.status, updatedAt: new Date().toISOString() });
        offerUndo('Pursuit archived', async () => {
          const { archivedStatus: previous, ...rest } = current;
          await pursuits.put({ ...rest, status: previous ?? 'active', updatedAt: new Date().toISOString() });
        });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That record could not be archived.');
    } finally {
      setBusyId('');
    }
  }

  async function restore(record: LifeRecord) {
    setBusyId(record.key);
    setError('');
    try {
      if (record.kind === 'reflection') await reflectionService.restore(record.sourceId);
      else if (record.kind === 'decision') await decisionService.restore(record.sourceId);
      else if (record.kind === 'life') await lifeService.restore(record.sourceId);
      else if (record.kind === 'pursuit') {
        const current = allPursuits.find((entry) => entry.id === record.sourceId);
        if (!current) throw new Error('That pursuit no longer exists.');
        const { archivedStatus: previous, ...rest } = current;
        await pursuits.put({ ...rest, status: previous ?? 'active', updatedAt: new Date().toISOString() });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That record could not be restored.');
    } finally {
      setBusyId('');
    }
  }

  async function unlink(record: LifeRecord) {
    if (!valueId) return;
    setBusyId(record.key);
    setError('');
    try {
      if (record.kind === 'reflection') await reflectionService.disconnectValue(record.sourceId, valueId);
      else if (record.kind === 'decision') await decisionService.disconnectValue(record.sourceId, valueId);
      else if (record.kind === 'life') await lifeService.disconnectValue(record.sourceId, valueId);
      else if (record.kind === 'pursuit') {
        const current = allPursuits.find((entry) => entry.id === record.sourceId);
        if (!current) throw new Error('That pursuit no longer exists.');
        const notes = { ...(current.valueNotes ?? {}) };
        delete notes[valueId];
        const { valueNotes: _previous, ...rest } = current;
        await pursuits.put(Object.keys(notes).length ? { ...current, valueNotes: notes } : rest);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That connection could not be removed.');
    } finally {
      setBusyId('');
    }
  }

  function clearAllFilters() {
    setSearch('');
    setCategory('all');
    setRange('all');
    setSortOrder('newest');
    setValueId('');
  }

  function openRecord(record: LifeRecord) {
    if (record.kind === 'reflection') {
      const key = record.key;
      setExpanded((current) => ({ ...current, [key]: !current[key] }));
      setEditingKey('');
    } else if (record.kind === 'decision') {
      openDecision(record.sourceId);
    } else if (record.kind === 'life') {
      openItem(record.sourceId);
    } else if (record.kind === 'pursuit') {
      openPursuit(record.sourceId);
      openCompassTab('motion');
      navigate('compass');
    }
  }

  function beginEdit(record: LifeRecord) {
    setEditingKey(record.key);
    setEditBody(record.body ?? '');
    setExpanded((current) => ({ ...current, [record.key]: true }));
  }

  async function saveEdit(record: LifeRecord) {
    setBusyId(record.key);
    setError('');
    try {
      await reflectionService.updateBody(record.sourceId, editBody);
      setEditingKey('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That reflection could not be saved.');
    } finally {
      setBusyId('');
    }
  }

  function toggleFavorite(record: LifeRecord) {
    setLibraryFavorite(record.key, !favoriteKeys.has(record.key));
  }

  return (
    <div className="page connections-page">
      <PageHero title="Library" subtitle="A searchable home for the things you think, choose, do and want to remember." back={{ label: 'Reflect', onBack: leave }} />

      <div className="connections-toolbar">
        <label className="connections-search">
          <Sym name="search" size={19} />
          <span className="sr-only">Search your library</span>
          <input type="search" aria-label="Search your library" placeholder="Find a thought, decision, workout, meal or book…" value={search} onChange={(event) => setSearch(event.target.value)} />
          {search && <button type="button" className="connections-clear" aria-label="Clear search" onClick={() => setSearch('')}><Sym name="close" size={16} /></button>}
        </label>
      </div>

      <div className="connections-mode">
        <div className="connections-mode__tabs" role="tablist" aria-label="Library view">
          <button type="button" role="tab" aria-selected={view === 'library'} onClick={() => setView('library')}>Library <span>{libraryCount}</span></button>
          <button type="button" role="tab" aria-selected={view === 'saved'} onClick={() => setView('saved')}>Saved <span>{savedCount}</span></button>
          <button type="button" role="tab" aria-selected={view === 'archived'} onClick={() => setView('archived')}>Archive <span>{archivedCount}</span></button>
        </div>
        <div className="connections-mode__summary">
          <span className="connections-total">{visibleRecords.length < scoped.length ? 'Showing ' + visibleRecords.length + ' of ' + scoped.length : scoped.length + (scoped.length === 1 ? ' entry' : ' entries')}</span>
          {hasFilters && <button type="button" className="connections-clear-all" onClick={clearAllFilters}>Clear all</button>}
        </div>
      </div>

      <div className="connections-categories" role="group" aria-label="Filter by type">
        {(Object.keys(categoryLabels) as Category[]).map((id) => (
          <button key={id} type="button" aria-pressed={category === id} className={category === id ? 'connections-category connections-category--active' : 'connections-category'} onClick={() => setCategory(id)}>
            {categoryLabels[id]}
          </button>
        ))}
      </div>

      <details className="connections-refine">
        <summary><span><Sym name="list" size={17} /> Refine library</span><span className="connections-refine__state">{hasFilters ? 'Filters applied' : 'Optional filters'} <Sym name="chevron" size={15} /></span></summary>
        <div className="connections-refine__fields">
          <label>
            <span>Connected value</span>
            <select className="field-input" value={valueId} onChange={(event) => setValueId(event.target.value)}>
              <option value="">All values</option>
              {values.map((value: ChosenValue) => <option key={value.id} value={value.id}>{value.name}</option>)}
            </select>
          </label>
          <label>
            <span>When</span>
            <select className="field-input" value={range} onChange={(event) => setRange(event.target.value as Range)}>
              <option value="all">Any time</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </label>
          <label>
            <span>Order</span>
            <select className="field-input" value={sortOrder} onChange={(event) => setSortOrder(event.target.value as SortOrder)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        </div>
      </details>

      {error && <p className="connections-error" role="alert">{error}</p>}

      {scoped.length === 0 ? (
        <div className="connections-empty">
          <span className="connections-empty__mark"><Sym name={view === 'archived' ? 'box' : view === 'saved' ? 'bookmark' : 'search'} size={26} /></span>
          <p className="connections-empty__title">{view === 'archived' ? 'Your archive is empty.' : view === 'saved' ? 'Nothing saved yet.' : 'Nothing here just yet.'}</p>
          <p>{hasFilters ? 'Try a different search or loosen your filters.' : view === 'saved' ? 'Save reflections and experiences you want to find again.' : 'Your reflections, decisions, experiences and pursuits will find their place here.'}</p>
          {hasFilters && <button type="button" className="connections-clear-all" onClick={clearAllFilters}>Clear all filters</button>}
        </div>
      ) : (
        <ol className="connections-list">
          {visibleRecords.map((record) => {
            const key = record.key;
            const names = linkedValueIds(record).map((id) => valueNames.get(id)).filter((name): name is string => Boolean(name));
            const isExpanded = Boolean(expanded[key]);
            const isEditing = editingKey === key;
            const saved = favoriteKeys.has(key);
            const canOpenExternally = Boolean(hrefFor(record));
            return (
              <li key={key} className="connections-list__item">
                <article className="connections-record">
                  <div className="connections-record__meta">
                    <span className={'connections-record__kind connections-record__kind--' + record.kind}>{kindLabels[record.kind]}</span>
                    <span className="connections-record__source">{record.source}</span>
                    <time dateTime={record.at}>{dateLabel(record.at)}</time>
                    <button type="button" className="connections-save" aria-label={saved ? 'Remove from saved' : 'Save to library'} aria-pressed={saved} onClick={() => toggleFavorite(record)}>
                      <Sym name="bookmark" size={18} />
                    </button>
                    {canArchive(record) && (
                      <details className="connections-actions">
                        <summary aria-label="More actions"><Sym name="more" size={19} /></summary>
                        <div className="connections-actions__menu">
                          {valueId && linkedValueIds(record).includes(valueId) && (
                            <button type="button" disabled={busyId === key} onClick={() => void unlink(record)}>Unlink {valueNames.get(valueId)}</button>
                          )}
                          <button type="button" disabled={busyId === key} onClick={() => void (record.archived ? restore(record) : archive(record))}>
                            {busyId === key ? 'Saving…' : record.archived ? 'Restore to library' : 'Move to archive'}
                          </button>
                        </div>
                      </details>
                    )}
                  </div>
                  {canOpenExternally ? (
                    <a className="connections-record__title" href={hrefFor(record)}>
                      <span>{record.title}</span>
                      {record.detail && <small>{record.detail}</small>}
                    </a>
                  ) : (
                    <button type="button" className="connections-record__title" aria-expanded={record.kind === 'reflection' ? isExpanded : undefined} onClick={() => openRecord(record)}>
                      <span>{record.title}</span>
                      {record.detail && <small>{record.detail}</small>}
                    </button>
                  )}
                  {record.kind === 'reflection' && isExpanded && (
                    isEditing ? (
                      <div className="connections-edit">
                        <textarea className="field-input field-input--area" rows={5} aria-label="Edit reflection" value={editBody} onChange={(event) => setEditBody(event.target.value)} />
                        <div className="connections-edit__actions">
                          <button type="button" className="button-quiet" onClick={() => setEditingKey('')}>Cancel</button>
                          <button type="button" className="button-accent button--sm" disabled={!editBody.trim() || busyId === key} onClick={() => void saveEdit(record)}>{busyId === key ? 'Saving…' : 'Save changes'}</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {record.body && <p className="connections-record__body">{record.body}</p>}
                        <button type="button" className="connections-edit-link" onClick={() => beginEdit(record)}>Edit reflection</button>
                      </>
                    )
                  )}
                  {record.kind !== 'reflection' && record.body && (
                    <details className="connections-record__details">
                      <summary>Read details</summary>
                      <p className="connections-record__body">{record.body}</p>
                    </details>
                  )}
                  {names.length > 0 && (
                    <div className="connections-record__values" aria-label="Connected values">
                      {names.map((name) => <span key={name}>{name}</span>)}
                    </div>
                  )}
                </article>
              </li>
            );
          })}
        </ol>
      )}
      {scoped.length > visibleCount && (
        <button type="button" className="connections-load-more" onClick={() => setVisibleCount((count) => count + 30)}>
          Show more <span>{scoped.length - visibleCount} remaining</span>
        </button>
      )}
    </div>
  );
}
