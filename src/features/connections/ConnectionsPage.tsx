import { useEffect, useMemo, useState } from 'react';
import { useLeave, useNavigate } from '../../app/navigationContext';
import { useServiceData } from '../../app/hooks/useServiceData';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { compassService, decisionService, lifeService, reflectionService } from '../../app/services';
import { pursuits } from '../../app/pursuits';
import { plan as dynamisPlan, workouts as dynamisWorkouts } from '../../dynamis/app/state';
import { useRuns } from '../../app/askesis/runs';
import { combineReadingSessions, useStudy } from '../../app/praxis/study';
import { useRecipesFromSoma } from '../../app/soma/meals';
import { notes as mnemeNotes, ideas as mnemeIdeas } from '../../mneme/app/state';
import { trips as poreiaTrips, journal as poreiaJournal, today as poreiaToday } from '../../poreia/app/state';
import { reflectMilestones as oikonomiaMilestones } from '../../oikonomia/data/reflect';
import { libraryFavorites, setLibraryFavorite } from '../../app/library/favorites';
import { buildLifeRecords, type LifeRecord } from '../../core/life-records';
import type { ChosenValue } from '../../core/values/types';
import PageHero from '../../components/layout/PageHero';
import { Sym } from '../../lamplight/icons';
import { openCompassTab } from '../compass/CompassPage';
import { openPursuit } from '../compass/PursuitsSection';
import LibraryRecordItem from './LibraryRecordItem';

type Category = 'all' | 'reflections' | 'decisions' | 'experiences' | 'pursuits' | 'life' | 'thoughts' | 'travel' | 'financial';
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
  thoughts: 'Notes & ideas',
  travel: 'Travel',
  financial: 'Money',
};

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
  if (category === 'thoughts') return record.kind === 'note' || record.kind === 'idea';
  if (category === 'travel') return record.kind === 'trip';
  if (category === 'financial') return record.kind === 'financial';
  return record.kind === 'life';
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
  const strengthWorkouts = dynamisWorkouts.use();
  const strengthPlan = dynamisPlan.use();
  const recipes = useRecipesFromSoma();
  const study = useStudy();
  const notes = mnemeNotes.use();
  const ideas = mnemeIdeas.use();
  const trips = poreiaTrips.use();
  const journal = poreiaJournal.use();
  const financialMilestones = oikonomiaMilestones.use();
  const tripToday = poreiaToday();
  const favorites = libraryFavorites.use();

  const [category, setCategory] = useState<Category>('all');
  const [view, setView] = useState<View>('library');
  const [range, setRange] = useState<Range>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [valueId, setValueId] = useState('');
  const [search, setSearch] = useState('');
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
    distanceUnit: runs?.unit ?? 'km',
    strengthWorkouts,
    strengthUnit: strengthPlan.unit ?? 'kg',
    recipes,
    studySessions: combineReadingSessions(study?.sessions ?? []),
    mnemeNotes: notes,
    mnemeIdeas: ideas,
    poreiaTrips: trips,
    poreiaJournal: journal,
    poreiaToday: tripToday,
    oikonomiaMilestones: financialMilestones,
  }), [reflections, decisions, allPursuits, items, runs, strengthWorkouts, strengthPlan.unit, recipes, study, notes, ideas, trips, journal, tripToday, financialMilestones]);

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
      if (valueId && !record.valueIds.includes(valueId)) return false;
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
      } else if (record.kind === 'note' && record.sourceApp === 'mneme') {
        const current = mnemeNotes.get(record.sourceId);
        if (!current) throw new Error('That note no longer exists.');
        mnemeNotes.put({ ...current, archived: true, updatedAt: new Date().toISOString() });
        offerUndo('Note archived', () => mnemeNotes.put({ ...current, archived: false, updatedAt: new Date().toISOString() }));
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
      else if (record.kind === 'note' && record.sourceApp === 'mneme') {
        const current = mnemeNotes.get(record.sourceId);
        if (!current) throw new Error('That note no longer exists.');
        mnemeNotes.put({ ...current, archived: false, updatedAt: new Date().toISOString() });
      } else if (record.kind === 'pursuit') {
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
    if (record.kind === 'decision') {
      openDecision(record.sourceId);
    } else if (record.kind === 'life') {
      openItem(record.sourceId);
    } else if (record.kind === 'pursuit') {
      openPursuit(record.sourceId);
      openCompassTab('motion');
      navigate('compass');
    }
  }

  async function saveEdit(record: LifeRecord, body: string): Promise<boolean> {
    setBusyId(record.key);
    setError('');
    try {
      await reflectionService.updateBody(record.sourceId, body);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That reflection could not be saved.');
      return false;
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
          <input type="search" aria-label="Search your library" placeholder="Find a note, idea, decision, trip, milestone or experience…" value={search} onChange={(event) => setSearch(event.target.value)} />
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
          <p>{hasFilters ? 'Try a different search or loosen your filters.' : view === 'saved' ? 'Save reflections and experiences you want to find again.' : 'Your selected notes and ideas, reflections, decisions, completed trips, milestones and experiences will find their place here.'}</p>
          {hasFilters && <button type="button" className="connections-clear-all" onClick={clearAllFilters}>Clear all filters</button>}
        </div>
      ) : (
        <ol className="connections-list">
          {visibleRecords.map((record) => {
            const names = record.valueIds.map((id) => valueNames.get(id)).filter((name): name is string => Boolean(name));
            return (
              <LibraryRecordItem
                key={record.key}
                record={record}
                saved={favoriteKeys.has(record.key)}
                valueNames={names}
                selectedValueId={valueId}
                selectedValueName={valueNames.get(valueId) ?? ''}
                busy={busyId === record.key}
                onToggleFavorite={toggleFavorite}
                onOpen={openRecord}
                onArchive={(entry) => void archive(entry)}
                onRestore={(entry) => void restore(entry)}
                onUnlink={(entry) => void unlink(entry)}
                onSaveReflection={saveEdit}
              />
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
