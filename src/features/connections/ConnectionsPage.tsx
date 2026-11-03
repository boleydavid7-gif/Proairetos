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
import { libraryValueConnections, setLibraryValueConnection } from '../../app/library/value-connections';
import { loadLibraryTimelineExpansion, saveLibraryTimelineExpansion } from '../../app/library/timeline';
import { expireLibraryTrash, libraryTrash, moveToLibraryTrash, permanentlyRemoveFromLibraryTrash, restoreFromLibraryTrash, LIBRARY_TRASH_RETENTION_DAYS, type LibraryTrashEntry } from '../../app/library/trash';
import { buildLifeRecords, type LifeRecord } from '../../core/life-records';
import { canArchiveLifeRecord, groupLifeRecords, groupLifeRecordsByYear, isLibraryTrashExpired, matchesLifeRecordQuery, mergeLibraryValueConnections, relatedLifeRecords, type LifeRecordGroupBy } from '../../core/life-records/library';
import type { ChosenValue } from '../../core/values/types';
import PageHero from '../../components/layout/PageHero';
import { Sym } from '../../lamplight/icons';
import { openCompassTab } from '../compass/CompassPage';
import { openPursuit } from '../compass/PursuitsSection';
import LibraryRecordItem from './LibraryRecordItem';

type Category = 'all' | 'reflections' | 'decisions' | 'experiences' | 'pursuits' | 'life' | 'thoughts' | 'travel' | 'financial';
type View = 'library' | 'saved' | 'archived' | 'trash';
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
  const valueConnections = libraryValueConnections.use();
  const trashEntries = libraryTrash.use();

  const [category, setCategory] = useState<Category>('all');
  const [view, setView] = useState<View>('library');
  const [range, setRange] = useState<Range>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [valueId, setValueId] = useState('');
  const [sourceApp, setSourceApp] = useState('');
  const [groupBy, setGroupBy] = useState<LifeRecordGroupBy>('month');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [visibleCount, setVisibleCount] = useState(30);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [bulkValueId, setBulkValueId] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [initialTimelineExpansion] = useState(loadLibraryTimelineExpansion);
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>(initialTimelineExpansion.years);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>(initialTimelineExpansion.months);

  const favoriteKeys = useMemo(() => new Set(favorites.map((favorite) => favorite.id)), [favorites]);
  const valueOptions = useMemo(() => values.map((value: ChosenValue) => ({ id: value.id, name: value.name })), [values]);
  const valueConnectionByRecord = useMemo(() => new Map(valueConnections.map((connection) => [connection.id, connection])), [valueConnections]);
  const sourceRecords = useMemo(() => buildLifeRecords({
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
  const sourceRecordByKey = useMemo(() => new Map(sourceRecords.map((record) => [record.key, record])), [sourceRecords]);

  const trashByRecord = useMemo(() => new Map(trashEntries.map((entry) => [entry.id, entry])), [trashEntries]);
  const trashedKeys = useMemo(() => new Set(trashEntries.filter((entry) => !entry.deletedAt).map((entry) => entry.id)), [trashEntries]);
  const deletedKeys = useMemo(() => new Set(trashEntries.filter((entry) => Boolean(entry.deletedAt)).map((entry) => entry.id)), [trashEntries]);
  const records = useMemo(
    () => mergeLibraryValueConnections(sourceRecords, valueConnections),
    [sourceRecords, valueConnections],
  );
  const notPermanentlyRemovedRecords = useMemo(
    () => records.filter((record) => !deletedKeys.has(record.key)),
    [records, deletedKeys],
  );
  const activeRecords = useMemo(
    () => notPermanentlyRemovedRecords.filter((record) => !trashedKeys.has(record.key)),
    [notPermanentlyRemovedRecords, trashedKeys],
  );
  const query = search.trim();
  const hasFilters = Boolean(query || category !== 'all' || valueId || sourceApp || range !== 'all');
  const availableRecords = useMemo(() => {
    if (view === 'trash') return notPermanentlyRemovedRecords.filter((record) => trashedKeys.has(record.key));
    return activeRecords.filter((record) => {
      if (view === 'archived' ? !record.archived : record.archived) return false;
      if (view === 'saved' && !favoriteKeys.has(record.key)) return false;
      return true;
    });
  }, [activeRecords, notPermanentlyRemovedRecords, trashedKeys, view, favoriteKeys]);
  const sourceOptions = useMemo(() => {
    const options = new Map<string, string>();
    availableRecords.forEach((record) => options.set(record.sourceApp, record.source));
    return [...options.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [availableRecords]);
  const baseScoped = useMemo(() => {
    const now = Date.now();
    return availableRecords.filter((record) => {
      if (!isInRange(record.at, range, now)) return false;
      if (valueId && !record.valueIds.includes(valueId)) return false;
      if (sourceApp && record.sourceApp !== sourceApp) return false;
      if (query && !matchesLifeRecordQuery(record, query)) return false;
      return true;
    });
  }, [availableRecords, range, valueId, sourceApp, query]);
  const scoped = useMemo(
    () => baseScoped.filter((record) => categoryMatches(record, category))
      .sort((a, b) => sortOrder === 'newest' ? b.at.localeCompare(a.at) : a.at.localeCompare(b.at)),
    [baseScoped, category, sortOrder],
  );
  const categoryCounts = useMemo(() => {
    const counts = {} as Record<Category, number>;
    (Object.keys(categoryLabels) as Category[]).forEach((id) => {
      counts[id] = id === 'all' ? baseScoped.length : baseScoped.filter((record) => categoryMatches(record, id)).length;
    });
    return counts;
  }, [baseScoped]);
  const libraryCount = activeRecords.filter((record) => !record.archived).length;
  const savedCount = activeRecords.filter((record) => !record.archived && favoriteKeys.has(record.key)).length;
  const archivedCount = activeRecords.filter((record) => record.archived).length;
  const trashCount = trashEntries.filter((entry) => !entry.deletedAt).length;
  const relationPool = useMemo(
    () => activeRecords.filter((record) => record.archived === (view === 'archived')),
    [activeRecords, view],
  );

  useEffect(() => {
    setVisibleCount(30);
    setSelectedKeys(new Set());
  }, [category, view, range, sortOrder, valueId, sourceApp, query]);
  useEffect(() => {
    saveLibraryTimelineExpansion({ years: expandedYears, months: expandedMonths });
  }, [expandedYears, expandedMonths]);
  useEffect(() => {
    const now = Date.now();
    trashEntries.forEach((entry) => {
      if (entry.deletedAt || !isLibraryTrashExpired(entry.trashedAt, now, LIBRARY_TRASH_RETENTION_DAYS)) return;
      setLibraryFavorite(entry.id, false);
      valueConnectionByRecord.get(entry.id)?.valueIds.forEach((linkedValueId) => setLibraryValueConnection(entry.id, linkedValueId, false));
    });
    expireLibraryTrash(trashEntries, now);
  }, [trashEntries, valueConnectionByRecord]);
  const visibleRecords = scoped.slice(0, visibleCount);
  const groups = useMemo(() => groupLifeRecords(visibleRecords, groupBy), [visibleRecords, groupBy]);
  const yearGroups = useMemo(() => groupLifeRecordsByYear(scoped), [scoped]);
  const visibleRecordKeys = useMemo(() => new Set(visibleRecords.map((record) => record.key)), [visibleRecords]);
  const selectedRecords = useMemo(
    () => scoped.filter((record) => selectedKeys.has(record.key)),
    [scoped, selectedKeys],
  );
  const selectedSavedCount = selectedRecords.filter((record) => favoriteKeys.has(record.key)).length;
  const selectedArchivableCount = selectedRecords.filter(canArchiveLifeRecord).length;
  const selectedTrashedCount = selectedRecords.filter((record) => trashedKeys.has(record.key)).length;
  const selectedLinkedCount = selectedRecords.filter((record) => bulkValueId && record.valueIds.includes(bulkValueId)).length;
  const allResultsSelected = scoped.length > 0 && selectedRecords.length === scoped.length;

  function clearLibraryMetadata(recordKey: string) {
    setLibraryFavorite(recordKey, false);
    const connection = valueConnectionByRecord.get(recordKey);
    connection?.valueIds.forEach((linkedValueId) => setLibraryValueConnection(recordKey, linkedValueId, false));
  }

  function moveRecordToTrash(record: LifeRecord) {
    const previous = trashByRecord.get(record.key);
    if (previous && !previous.deletedAt) return;
    moveToLibraryTrash(record.key);
    offerUndo('Moved to Recently Deleted', async () => { restoreFromLibraryTrash(record.key); });
  }

  function restoreRecordFromTrash(record: LifeRecord) {
    const previous = trashByRecord.get(record.key);
    if (!previous || previous.deletedAt) return;
    if (!restoreFromLibraryTrash(record.key)) return;
    offerUndo('Restored to its previous location', async () => moveToLibraryTrash(record.key, previous.trashedAt));
  }

  function permanentlyRemoveRecord(record: LifeRecord) {
    if (!window.confirm(`Permanently remove “${record.title}” from Reflect? Its original record will remain in ${record.source}.`)) return;
    permanentlyRemoveFromLibraryTrash(record.key);
    clearLibraryMetadata(record.key);
  }

  function emptyTrash() {
    const entries = trashEntries.filter((entry) => !entry.deletedAt);
    if (!entries.length) return;
    if (!window.confirm(`Permanently remove ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} from Reflect? Original records will remain in their source apps.`)) return;
    entries.forEach((entry) => {
      permanentlyRemoveFromLibraryTrash(entry.id);
      clearLibraryMetadata(entry.id);
    });
    clearSelection();
  }

  async function bulkMoveToTrash() {
    const targets = selectedRecords.filter((record) => !trashedKeys.has(record.key));
    if (!targets.length || bulkBusy) return;
    setBulkBusy(true);
    const previousEntries = targets.map((record) => trashByRecord.get(record.key)).filter((entry): entry is LibraryTrashEntry => Boolean(entry));
    try {
      targets.forEach((record) => moveToLibraryTrash(record.key));
      offerUndo(`${targets.length} ${targets.length === 1 ? 'entry' : 'entries'} moved to Recently Deleted`, async () => {
        targets.forEach((record) => restoreFromLibraryTrash(record.key));
        previousEntries.forEach((entry) => libraryTrash.put(entry));
      });
      clearSelection();
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkRestoreFromTrash() {
    const targets = selectedRecords.filter((record) => trashedKeys.has(record.key));
    if (!targets.length || bulkBusy) return;
    setBulkBusy(true);
    const previousEntries = targets.map((record) => trashByRecord.get(record.key)).filter((entry): entry is LibraryTrashEntry => Boolean(entry));
    try {
      const restoredEntries = previousEntries.filter((entry) => restoreFromLibraryTrash(entry.id));
      if (restoredEntries.length) {
        offerUndo(`${restoredEntries.length} ${restoredEntries.length === 1 ? 'entry' : 'entries'} restored`, async () => {
          restoredEntries.forEach((entry) => {
            if (!libraryTrash.get(entry.id)?.deletedAt) libraryTrash.put(entry);
          });
        });
      }
      clearSelection();
    } finally {
      setBulkBusy(false);
    }
  }

  function bulkPermanentlyRemove() {
    const targets = selectedRecords.filter((record) => trashedKeys.has(record.key));
    if (!targets.length || bulkBusy) return;
    if (!window.confirm(`Permanently remove ${targets.length} selected ${targets.length === 1 ? 'entry' : 'entries'} from Reflect? Original records will remain in their source apps.`)) return;
    targets.forEach((record) => {
      permanentlyRemoveFromLibraryTrash(record.key);
      clearLibraryMetadata(record.key);
    });
    clearSelection();
  }

  async function setRecordArchived(record: LifeRecord, archived: boolean): Promise<() => Promise<void>> {
    const updatedAt = new Date().toISOString();

    if (record.kind === 'reflection') {
      if (archived) await reflectionService.archive(record.sourceId);
      else await reflectionService.restore(record.sourceId);
      return async () => {
        if (archived) await reflectionService.restore(record.sourceId);
        else await reflectionService.archive(record.sourceId);
      };
    }

    if (record.kind === 'decision') {
      if (archived) await decisionService.archive(record.sourceId);
      else await decisionService.restore(record.sourceId);
      return async () => {
        if (archived) await decisionService.restore(record.sourceId);
        else await decisionService.archive(record.sourceId);
      };
    }

    if (record.kind === 'life') {
      if (archived) await lifeService.archive(record.sourceId);
      else await lifeService.restore(record.sourceId);
      return async () => {
        if (archived) await lifeService.restore(record.sourceId);
        else await lifeService.archive(record.sourceId);
      };
    }

    if (record.kind === 'note' && record.sourceApp === 'mneme') {
      const current = mnemeNotes.get(record.sourceId);
      if (!current) throw new Error('That note no longer exists.');
      mnemeNotes.put({ ...current, archived, updatedAt });
      return async () => {
        mnemeNotes.put({ ...current, archived: Boolean(current.archived), updatedAt: new Date().toISOString() });
      };
    }

    if (record.kind === 'pursuit') {
      const current = allPursuits.find((entry) => entry.id === record.sourceId);
      if (!current) throw new Error('That pursuit no longer exists.');

      if (archived) {
        await pursuits.put({
          ...current,
          status: 'archived',
          archivedStatus: current.status === 'archived' ? current.archivedStatus : current.status,
          updatedAt,
        });
        return async () => {
          const { archivedStatus: previous, ...rest } = current;
          await pursuits.put({ ...rest, status: previous ?? 'active', updatedAt: new Date().toISOString() });
        };
      }

      const { archivedStatus: previous, ...rest } = current;
      await pursuits.put({ ...rest, status: previous ?? 'active', updatedAt });
      return async () => {
        await pursuits.put({ ...current, updatedAt: new Date().toISOString() });
      };
    }

    throw new Error('This entry cannot be archived from the Library.');
  }

  async function archive(record: LifeRecord) {
    setBusyId(record.key);
    setError('');
    try {
      const undo = await setRecordArchived(record, true);
      offerUndo('Entry archived', undo);
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
      const undo = await setRecordArchived(record, false);
      offerUndo('Entry restored', undo);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That record could not be restored.');
    } finally {
      setBusyId('');
    }
  }

  async function disconnectValueFromRecord(record: LifeRecord, linkedValueId: string) {
    const libraryLinks = valueConnectionByRecord.get(record.key)?.valueIds ?? [];
    const hasLibraryLink = libraryLinks.includes(linkedValueId);
    const hasNativeLink = sourceRecordByKey.get(record.key)?.valueIds.includes(linkedValueId) ?? false;

    if (hasLibraryLink) setLibraryValueConnection(record.key, linkedValueId, false);
    if (!hasNativeLink) return;

    if (record.kind === 'reflection') await reflectionService.disconnectValue(record.sourceId, linkedValueId);
    else if (record.kind === 'decision') await decisionService.disconnectValue(record.sourceId, linkedValueId);
    else if (record.kind === 'life') await lifeService.disconnectValue(record.sourceId, linkedValueId);
    else if (record.kind === 'pursuit') {
      const current = allPursuits.find((entry) => entry.id === record.sourceId);
      if (!current) throw new Error('That pursuit no longer exists.');
      const notes = { ...(current.valueNotes ?? {}) };
      delete notes[linkedValueId];
      const { valueNotes: _previous, ...rest } = current;
      await pursuits.put(Object.keys(notes).length ? { ...current, valueNotes: notes } : rest);
    }
  }

  async function unlink(record: LifeRecord, linkedValueId: string) {
    if (!linkedValueId) return;
    setBusyId(record.key);
    setError('');
    try {
      await disconnectValueFromRecord(record, linkedValueId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That connection could not be removed.');
    } finally {
      setBusyId('');
    }
  }

  function linkValue(record: LifeRecord, linkedValueId: string) {
    if (!linkedValueId || record.valueIds.includes(linkedValueId)) return;
    setLibraryValueConnection(record.key, linkedValueId, true);
  }

  function toggleSelected(record: LifeRecord, selected: boolean) {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (selected) next.add(record.key);
      else next.delete(record.key);
      return next;
    });
  }

  function toggleSelectionMode() {
    if (selectionMode) {
      setSelectedKeys(new Set());
      setSelectionMode(false);
    } else {
      setSelectionMode(true);
    }
  }

  function toggleSelectAllResults() {
    setSelectedKeys(allResultsSelected ? new Set() : new Set(scoped.map((record) => record.key)));
  }

  function clearSelection() {
    setSelectedKeys(new Set());
  }

  function setSelectedFavorites(saved: boolean) {
    selectedRecords.forEach((record) => setLibraryFavorite(record.key, saved));
    clearSelection();
  }

  async function bulkSetArchiveState(archived: boolean) {
    const eligible = selectedRecords.filter(canArchiveLifeRecord);
    if (!eligible.length || bulkBusy) return;

    setBulkBusy(true);
    setError('');
    const undoActions: Array<() => Promise<void>> = [];
    const failedTitles: string[] = [];

    try {
      for (const record of eligible) {
        try {
          undoActions.push(await setRecordArchived(record, archived));
        } catch {
          failedTitles.push(record.title);
        }
      }

      if (undoActions.length) {
        const verb = archived ? 'archived' : 'restored';
        offerUndo(`${undoActions.length} entries ${verb}`, async () => {
          for (const undo of [...undoActions].reverse()) await undo();
        });
      }

      clearSelection();
      if (failedTitles.length) {
        setError(`${failedTitles.length} entr${failedTitles.length === 1 ? 'y could' : 'ies could'} not be ${archived ? 'archived' : 'restored'}.`);
      }
    } finally {
      setBulkBusy(false);
    }
  }

  function bulkConnectValue() {
    if (!bulkValueId || !selectedRecords.length || bulkBusy) return;
    const targets = selectedRecords.filter((record) => !record.valueIds.includes(bulkValueId));
    targets.forEach((record) => setLibraryValueConnection(record.key, bulkValueId, true));
    clearSelection();
    setError(targets.length ? '' : 'Every selected entry is already connected to that value.');
  }

  async function bulkDisconnectValue() {
    if (!bulkValueId || !selectedLinkedCount || bulkBusy) return;
    const targets = selectedRecords.filter((record) => record.valueIds.includes(bulkValueId));
    setBulkBusy(true);
    setError('');
    const failedTitles: string[] = [];

    try {
      for (const record of targets) {
        try {
          await disconnectValueFromRecord(record, bulkValueId);
        } catch {
          failedTitles.push(record.title);
        }
      }

      clearSelection();
      if (failedTitles.length) {
        setError(`${failedTitles.length} entr${failedTitles.length === 1 ? 'y could' : 'ies could'} not be disconnected.`);
      }
    } finally {
      setBulkBusy(false);
    }
  }

  function clearAllFilters() {
    setSearch('');
    setCategory('all');
    setRange('all');
    setSortOrder('newest');
    setValueId('');
    setSourceApp('');
  }

  function findRelated(record: LifeRecord) {
    setView(record.archived ? 'archived' : 'library');
    setCategory('all');
    setRange('all');
    setSortOrder('newest');
    setValueId('');
    setSourceApp('');
    setSearch(record.title);
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
          <button type="button" role="tab" aria-selected={view === 'trash'} onClick={() => setView('trash')}>Trash <span>{trashCount}</span></button>
        </div>
        <div className="connections-mode__summary">
          <span className="connections-total">{visibleRecords.length < scoped.length ? 'Showing ' + visibleRecords.length + ' of ' + scoped.length : scoped.length + (scoped.length === 1 ? ' entry' : ' entries')}</span>
          {hasFilters && <button type="button" className="connections-clear-all" onClick={clearAllFilters}>Clear all</button>}
          {view === 'trash' && trashCount > 0 && <button type="button" className="connections-clear-all connections-empty-trash" onClick={emptyTrash}>Empty trash</button>}
          <button type="button" className="connections-select-toggle button-quiet" aria-pressed={selectionMode} onClick={toggleSelectionMode}>
            {selectionMode ? 'Done selecting' : 'Select'}
          </button>
        </div>
      </div>

      <div className="connections-categories" role="group" aria-label="Filter by type">
        {(Object.keys(categoryLabels) as Category[]).map((id) => (
          <button key={id} type="button" aria-pressed={category === id} className={category === id ? 'connections-category connections-category--active' : 'connections-category'} onClick={() => setCategory(id)}>
            {categoryLabels[id]} <span className="connections-category__count">{categoryCounts[id]}</span>
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
            <span>Source app</span>
            <select className="field-input" value={sourceApp} onChange={(event) => setSourceApp(event.target.value)}>
              <option value="">All apps</option>
              {sourceOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
          <label>
            <span>Order</span>
            <select className="field-input" value={sortOrder} onChange={(event) => setSortOrder(event.target.value as SortOrder)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
          <label>
            <span>Group by</span>
            <select className="field-input" value={groupBy} onChange={(event) => setGroupBy(event.target.value as LifeRecordGroupBy)}>
              <option value="month">Year &amp; month</option>
              <option value="source">App</option>
              <option value="none">No groups</option>
            </select>
          </label>
        </div>
      </details>

      {selectionMode && (
        <section className="connections-bulk" aria-label="Bulk library actions">
          <div className="connections-bulk__header">
            <p aria-live="polite" aria-atomic="true"><strong>{selectedRecords.length}</strong> selected <span>of {scoped.length} results</span></p>
            <div className="connections-bulk__selection-actions">
              <button type="button" className="button-quiet" disabled={!scoped.length || bulkBusy} onClick={toggleSelectAllResults}>
                {allResultsSelected ? 'Clear selection' : `Select all ${scoped.length}`}
              </button>
              <button type="button" className="button-quiet" disabled={!selectedRecords.length || bulkBusy} onClick={clearSelection}>Clear</button>
            </div>
          </div>

          {selectedRecords.length > 0 ? (
            view === 'trash' ? (
              <div className="connections-bulk__actions">
                <button type="button" className="button-accent" disabled={bulkBusy} onClick={() => void bulkRestoreFromTrash()}>Restore {selectedTrashedCount}</button>
                <button type="button" className="button-quiet connections-action--destructive" disabled={bulkBusy} onClick={bulkPermanentlyRemove}>Remove permanently</button>
              </div>
            ) : (
              <div className="connections-bulk__body">
                <div className="connections-bulk__actions">
                  {selectedSavedCount < selectedRecords.length && (
                    <button type="button" className="button-quiet" disabled={bulkBusy} onClick={() => setSelectedFavorites(true)}>Save selected</button>
                  )}
                  {selectedSavedCount > 0 && (
                    <button type="button" className="button-quiet" disabled={bulkBusy} onClick={() => setSelectedFavorites(false)}>Remove saved</button>
                  )}
                  {selectedArchivableCount > 0 && (
                    <button type="button" className="button-accent" disabled={bulkBusy} onClick={() => void bulkSetArchiveState(view !== 'archived')}>
                      {bulkBusy ? 'Working…' : view === 'archived' ? `Restore ${selectedArchivableCount}` : `Archive ${selectedArchivableCount}`}
                    </button>
                  )}
                  <button type="button" className="button-quiet connections-action--destructive" disabled={bulkBusy} onClick={() => void bulkMoveToTrash()}>Move to Recently Deleted</button>
                </div>

                <div className="connections-bulk__connections">
                  <label>
                    <span>Compass value</span>
                    <select className="field-input" value={bulkValueId} onChange={(event) => setBulkValueId(event.target.value)}>
                      <option value="">Choose a value</option>
                      {valueOptions.map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}
                    </select>
                  </label>
                  <button type="button" className="button-accent" disabled={!bulkValueId || bulkBusy || !selectedRecords.some((record) => !record.valueIds.includes(bulkValueId))} onClick={bulkConnectValue}>Connect selected</button>
                  <button type="button" className="button-quiet" disabled={!bulkValueId || bulkBusy || !selectedLinkedCount} onClick={() => void bulkDisconnectValue()}>
                    Disconnect{selectedLinkedCount ? ` ${selectedLinkedCount}` : ''}
                  </button>
                </div>
              </div>
            )
          ) : (
            <p className="connections-bulk__hint">{view === 'trash' ? 'Select deleted entries to restore them or permanently remove them from Reflect.' : 'Select entries below to save, archive, restore or connect them to a Compass value.'}</p>
          )}
        </section>
      )}

      {error && <p className="connections-error" role="alert">{error}</p>}

      {scoped.length === 0 ? (
        <div className="connections-empty">
          <span className="connections-empty__mark"><Sym name={view === 'trash' ? 'trash' : view === 'archived' ? 'box' : view === 'saved' ? 'bookmark' : 'search'} size={26} /></span>
          <p className="connections-empty__title">{view === 'trash' && trashCount > 0 ? 'No matching entries are available.' : view === 'trash' ? 'Recently Deleted is empty.' : view === 'archived' ? 'Your archive is empty.' : view === 'saved' ? 'Nothing saved yet.' : 'Nothing here just yet.'}</p>
          <p>{hasFilters ? 'Try a different search or loosen your filters.' : view === 'trash' && trashCount > 0 ? 'Some original records may have been removed from their source apps. Empty Trash clears the remaining Reflect markers.' : view === 'trash' ? 'Entries you move here stay for 30 days. Removing them from Reflect never deletes the original in its source app.' : view === 'saved' ? 'Save reflections and experiences you want to find again.' : 'Your selected notes and ideas, reflections, decisions, completed trips, milestones and experiences will find their place here.'}</p>
          {hasFilters && <button type="button" className="connections-clear-all" onClick={clearAllFilters}>Clear all filters</button>}
        </div>
      ) : (
        <div className="connections-groups">
          {groupBy === 'month' ? yearGroups.map((year, yearIndex) => {
            const yearExpanded = expandedYears[year.key] ?? yearIndex === 0;
            const visibleMonths = year.months.filter((month) => month.records.some((record) => visibleRecordKeys.has(record.key)));
            return (
              <section className="connections-year" key={year.key}>
                <button type="button" className="connections-year__toggle" aria-expanded={yearExpanded} onClick={() => setExpandedYears((current) => ({ ...current, [year.key]: !yearExpanded }))}>
                  <span className="connections-year__title"><Sym name="chevron" size={16} className={yearExpanded ? 'connections-disclosure-icon connections-disclosure-icon--open' : 'connections-disclosure-icon'} /> {year.label}</span>
                  <span className="connections-year__count">{year.records.length}</span>
                </button>
                {yearExpanded && (
                  <div className="connections-year__months">
                    {visibleMonths.map((month, monthIndex) => {
                      const monthKey = `${year.key}:${month.key}`;
                      const monthExpanded = expandedMonths[monthKey] ?? (yearIndex === 0 && monthIndex === 0);
                      const monthVisibleRecords = month.records.filter((record) => visibleRecordKeys.has(record.key));
                      return (
                        <section className="connections-month" key={month.key}>
                          <button type="button" className="connections-month__toggle" aria-expanded={monthExpanded} onClick={() => setExpandedMonths((current) => ({ ...current, [monthKey]: !monthExpanded }))}>
                            <span className="connections-month__title"><Sym name="chevron" size={14} className={monthExpanded ? 'connections-disclosure-icon connections-disclosure-icon--open' : 'connections-disclosure-icon'} /> {month.label}</span>
                            <span className="connections-month__count">{month.records.length}</span>
                          </button>
                          {monthExpanded && (
                            <ol className="connections-list">
                              {monthVisibleRecords.map((record) => (
                                <LibraryRecordItem
                                  key={record.key}
                                  record={record}
                                  saved={favoriteKeys.has(record.key)}
                                  trashed={view === 'trash'}
                                  expiresAt={trashByRecord.get(record.key) && !trashByRecord.get(record.key)?.deletedAt ? new Date(new Date(trashByRecord.get(record.key)!.trashedAt).getTime() + LIBRARY_TRASH_RETENTION_DAYS * 86_400_000).toISOString() : undefined}
                                  selectionMode={selectionMode}
                                  selected={selectedKeys.has(record.key)}
                                  availableValues={valueOptions}
                                  relatedRecords={relatedLifeRecords(record, relationPool, 3)}
                                  busy={bulkBusy || busyId === record.key}
                                  onToggleFavorite={toggleFavorite}
                                  onToggleSelected={toggleSelected}
                                  onOpen={openRecord}
                                  onArchive={(entry) => void archive(entry)}
                                  onRestore={(entry) => void restore(entry)}
                                  onMoveToTrash={moveRecordToTrash}
                                  onRestoreFromTrash={restoreRecordFromTrash}
                                  onPermanentlyRemove={permanentlyRemoveRecord}
                                  onUnlink={(entry, linkedValueId) => void unlink(entry, linkedValueId)}
                                  onLinkValue={linkValue}
                                  onFilterValue={setValueId}
                                  onFindRelated={findRelated}
                                  onSaveReflection={saveEdit}
                                />
                              ))}
                            </ol>
                          )}
                        </section>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          }) : groups.map((group) => (
            <section className="connections-group" key={group.key}>
              {groupBy !== 'none' && (
                <header className="connections-group__heading">
                  <h2>{group.label}</h2>
                  <span>{group.records.length}</span>
                </header>
              )}
              <ol className="connections-list">
                {group.records.map((record) => (
                  <LibraryRecordItem
                    key={record.key}
                    record={record}
                    saved={favoriteKeys.has(record.key)}
                    trashed={view === 'trash'}
                    expiresAt={trashByRecord.get(record.key) && !trashByRecord.get(record.key)?.deletedAt ? new Date(new Date(trashByRecord.get(record.key)!.trashedAt).getTime() + LIBRARY_TRASH_RETENTION_DAYS * 86_400_000).toISOString() : undefined}
                    selectionMode={selectionMode}
                    selected={selectedKeys.has(record.key)}
                    availableValues={valueOptions}
                    relatedRecords={relatedLifeRecords(record, relationPool, 3)}
                    busy={bulkBusy || busyId === record.key}
                    onToggleFavorite={toggleFavorite}
                    onToggleSelected={toggleSelected}
                    onOpen={openRecord}
                    onArchive={(entry) => void archive(entry)}
                    onRestore={(entry) => void restore(entry)}
                    onMoveToTrash={moveRecordToTrash}
                    onRestoreFromTrash={restoreRecordFromTrash}
                    onPermanentlyRemove={permanentlyRemoveRecord}
                    onUnlink={(entry, linkedValueId) => void unlink(entry, linkedValueId)}
                    onLinkValue={linkValue}
                    onFilterValue={setValueId}
                    onFindRelated={findRelated}
                    onSaveReflection={saveEdit}
                  />
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
      {scoped.length > visibleCount && (
        <button type="button" className="connections-load-more" onClick={() => setVisibleCount((count) => count + 30)}>
          Show more <span>{scoped.length - visibleCount} remaining</span>
        </button>
      )}
    </div>
  );
}
