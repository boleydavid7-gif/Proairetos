import type { LogEntry as AskesisWorkout } from '../../askesis/core/log';
import type { Idea as MnemeIdea, Note as MnemeNote } from '../../mneme/app/state';
import type { JournalEntry, Trip } from '../../poreia/core/model';
import { phaseOf, placesOf } from '../../poreia/core/model';
import type { FinancialMilestone } from '../../oikonomia/data/reflect';
import type { Workout as DynamisWorkout } from '../../dynamis/core/plan';
import type { StudySession } from '../../app/praxis/study';
import type { Recipe } from '../../soma/core/recipes';
import type { Decision } from '../decisions/types';
import type { LifeItem } from '../life-items/types';
import type { Reflection } from '../reflections/types';
import { createLifeRecord, lifeRecordKey, type LifeRecordAdapter, type LifeRecordApp, type LifeRecordDraft, type LifeRecordSource } from './contract';
export type { LifeRecord, LifeRecordAdapter, LifeRecordApp, LifeRecordKind, LifeRecordSource } from './contract';
export { createLifeRecord, lifeRecordKey, validateLifeRecordAdapter, LIFE_RECORD_APP_LABELS } from './contract';
import type { LifeRecord } from './contract';

export interface LifeRecordInput {
  reflections?: readonly Reflection[];
  decisions?: readonly Decision[];
  pursuits?: readonly {
    id: string; title: string; status: 'active' | 'paused' | 'complete' | 'archived';
    area?: string; outcome?: string; why?: string; current?: string; friction?: string; approach?: string; reviewNote?: string; nextMove?: string;
    valueNotes?: Record<string, string>; createdAt: string; updatedAt: string;
  }[];
  items?: readonly LifeItem[];
  workouts?: readonly AskesisWorkout[];
  strengthWorkouts?: readonly DynamisWorkout[];
  strengthUnit?: 'kg' | 'lb';
  recipes?: readonly Pick<Recipe, 'id' | 'title' | 'notes' | 'tags' | 'ingredients' | 'source' | 'cookedFor'>[];
  distanceUnit?: 'km' | 'mi';
  studySessions?: readonly StudySession[];
  mnemeNotes?: readonly MnemeNote[];
  mnemeIdeas?: readonly MnemeIdea[];
  poreiaTrips?: readonly Trip[];
  poreiaJournal?: readonly JournalEntry[];
  poreiaToday?: string;
  oikonomiaMilestones?: readonly FinancialMilestone[];
}

const compact = (value: string | undefined) => value?.trim() ?? '';
const firstLine = (value: string) => value.trim().split(/\r?\n/, 1)[0].slice(0, 92);
const join = (...parts: Array<string | undefined>) => parts.map(compact).filter(Boolean).join(' · ');
const record = (input: LifeRecordDraft & { searchParts?: readonly (string | undefined)[] }): LifeRecord =>
  createLifeRecord(input);

function reflectionRecord(entry: Reflection): LifeRecord {
  const kind = entry.kind === 'INTENTION' ? 'Daily intention' : entry.kind.replaceAll('_', ' ').toLocaleLowerCase();
  const prompt = entry.promptKey?.replaceAll('-', ' ');
  const appSources: Record<string, { source: LifeRecordSource; sourceApp: LifeRecordApp }> = {
    'after-run': { source: 'Askesis', sourceApp: 'askesis' },
    'after-meal': { source: 'Soma', sourceApp: 'soma' },
    'after-study': { source: 'Theoria', sourceApp: 'theoria' },
    'after-reading': { source: 'Theoria', sourceApp: 'theoria' },
    'after-strength': { source: 'Dynamis', sourceApp: 'dynamis' },
    'after-trip': { source: 'Poreia', sourceApp: 'poreia' },
  };
  const origin = appSources[entry.promptKey ?? ''] ?? { source: 'Proairetos' as const, sourceApp: 'proairetos' as const };
  return record({
    key: `reflection:${entry.id}`,
    kind: 'reflection',
    sourceApp: origin.sourceApp,
    source: origin.source,
    sourceId: entry.id,
    at: entry.archivedAt ?? entry.createdAt,
    title: firstLine(entry.body) || 'Reflection',
    detail: join(kind, prompt),
    body: entry.body,
    valueIds: entry.valueIds ?? [],
    archived: Boolean(entry.archivedAt),
  });
}

function decisionRecord(entry: Decision): LifeRecord {
  return record({
    key: `decision:${entry.id}`,
    kind: 'decision',
    sourceApp: 'compass',
    source: 'Compass',
    sourceId: entry.id,
    at: entry.archivedAt ?? entry.decidedAt,
    title: entry.question,
    detail: `Chose: ${entry.choice}`,
    body: join(entry.reasons, entry.expected ? `Expected: ${entry.expected}` : undefined),
    valueIds: Object.keys(entry.valueNotes ?? {}),
    archived: Boolean(entry.archivedAt),
    searchParts: entry.options,
  });
}

type PursuitRecord = NonNullable<LifeRecordInput['pursuits']>[number];
type WorkoutRecord = AskesisWorkout;

function pursuitRecord(entry: PursuitRecord): LifeRecord {
  const status = entry.status === 'complete' ? 'Complete' : entry.status === 'paused' ? 'Paused' : entry.status === 'archived' ? 'Archived' : 'Active';
  return record({
    key: `pursuit:${entry.id}`,
    kind: 'pursuit',
    sourceApp: 'compass',
    source: 'Compass',
    sourceId: entry.id,
    at: entry.status === 'archived' ? entry.updatedAt : entry.createdAt,
    title: entry.title,
    detail: join(status, entry.area),
    body: join(entry.outcome, entry.why, entry.current, entry.friction, entry.approach, entry.reviewNote, entry.nextMove ? `Next: ${entry.nextMove}` : undefined),
    valueIds: Object.keys(entry.valueNotes ?? {}),
    archived: entry.status === 'archived',
  });
}

function lifeItemRecord(entry: LifeItem): LifeRecord {
  const type = entry.type === 'DO' ? 'To do' : entry.type === 'REMEMBER' ? 'Remember' : entry.type === 'MAKE_TIME_FOR' ? 'Make time for' : entry.type === 'THINKING_ABOUT' ? 'Thinking about' : 'Unsorted';
  const status = entry.status === 'DONE' ? 'Done' : entry.status === 'WAITING' ? 'Waiting' : entry.status === 'LET_GO' ? 'Let go' : 'Open';
  return record({
    key: `life:${entry.id}`,
    kind: 'life',
    sourceApp: 'proairetos',
    source: 'Proairetos',
    sourceId: entry.id,
    at: entry.archivedAt ?? entry.createdAt,
    title: entry.title,
    detail: join(type, status),
    body: join(entry.notes, entry.nextStep ? `Next step: ${entry.nextStep}` : undefined, entry.nextStepCue ? `When: ${entry.nextStepCue}` : undefined, entry.ifObstacle ? `If blocked: ${entry.ifObstacle}` : undefined, entry.location ? `Place: ${entry.location}` : undefined),
    valueIds: entry.valueIds ?? [],
    archived: Boolean(entry.archivedAt),
  });
}

function workoutRecord(entry: WorkoutRecord, unit: 'km' | 'mi'): LifeRecord {
  const activity = entry.workoutTitle ?? ({ run: 'Run', walk: 'Walk', hike: 'Hike', bike: 'Bike', other: 'Activity' } as const)[entry.activity];
  const details = [
    entry.meters ? `${(entry.meters / (unit === 'mi' ? 1609.344 : 1000)).toFixed(1)} ${unit}` : undefined,
    entry.seconds ? `${Math.round(entry.seconds / 60)} min` : undefined,
    entry.felt ? `Felt ${entry.felt}` : undefined,
  ];
  return record({
    key: `workout:${entry.id}`,
    kind: 'workout',
    sourceApp: 'askesis',
    source: 'Askesis',
    sourceId: entry.id,
    at: entry.createdAt || `${entry.date}T12:00:00`,
    title: activity,
    detail: join(...details),
    body: join(entry.notes, entry.wentWell ? `Went well: ${entry.wentWell}` : undefined, entry.nextTime ? `Next time: ${entry.nextTime}` : undefined, entry.intention ? `Intention: ${entry.intention}` : undefined),
    valueIds: [],
    archived: false,
    searchParts: [entry.date, entry.activity],
  });
}

function strengthWorkoutRecord(
  entry: DynamisWorkout,
  unit: 'kg' | 'lb',
): LifeRecord {
  const exercises = entry.exercises.filter((exercise) => exercise.sets.length > 0);
  const setCount = exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  const title = exercises.length
    ? exercises.slice(0, 2).map((exercise) => exercise.name).join(', ') + (exercises.length > 2 ? ` + ${exercises.length - 2} more` : '')
    : 'Strength session';
  const details = exercises.map((exercise) => {
    const sets = exercise.sets.map((set) => set.weight === undefined
      ? `${set.reps} reps`
      : `${set.weight} ${unit} × ${set.reps}`);
    return `${exercise.name}: ${sets.join(', ')}`;
  });
  return record({
    key: `dynamis-workout:${entry.id}`,
    kind: 'workout',
    sourceApp: 'dynamis',
    source: 'Dynamis',
    sourceId: entry.id,
    at: entry.createdAt || `${entry.date}T12:00:00`,
    title,
    detail: join(
      `${setCount} ${setCount === 1 ? 'set' : 'sets'}`,
      entry.minutes ? `${entry.minutes} min` : undefined,
      entry.felt ? `Felt ${entry.felt}` : undefined,
    ),
    body: join(details.join(' · '), entry.note),
    valueIds: [],
    archived: false,
    searchParts: [entry.date, entry.session, ...exercises.flatMap((exercise) => [
      exercise.exercise,
      exercise.name,
      ...exercise.sets.flatMap((set) => [String(set.reps), set.weight === undefined ? '' : String(set.weight), unit]),
    ])],
  });
}

function mealRecords(recipes: NonNullable<LifeRecordInput['recipes']>): LifeRecord[] {
  return recipes.flatMap((recipe) =>
    Object.entries(recipe.cookedFor ?? {})
      .filter(([, people]) => people.length > 0)
      .map(([day, people]) => {
        const who = people.length <= 1 ? people[0] : `${people.slice(0, -1).join(', ')} and ${people.at(-1)}`;
        return record({
          key: `meal:${recipe.id}@${day}`,
          kind: 'meal',
          sourceApp: 'soma',
          source: 'Soma',
          sourceId: recipe.id,
          // Soma stores a calendar day, not a time; local noon keeps that day stable across time zones.
          at: day + 'T12:00:00',
          title: recipe.title,
          detail: `Cooked for ${who}`,
          body: recipe.notes,
          valueIds: [],
          archived: false,
          searchParts: [day, ...(recipe.tags ?? []), ...(recipe.ingredients ?? []), recipe.source].filter((part): part is string => Boolean(part)),
        });
      }),
  );
}

function studyRecord(entry: NonNullable<LifeRecordInput['studySessions']>[number]): LifeRecord {
  const reading = entry.kind === 'reading';
  return record({
    key: `study:${entry.id}`,
    kind: 'study',
    sourceApp: 'theoria',
    source: 'Theoria',
    sourceId: entry.id,
    at: entry.at,
    title: entry.title,
    detail: `${entry.minutes} min · ${reading ? 'Reading' : 'Study'}`,
    valueIds: [],
    archived: false,
    searchParts: [reading ? 'reading book' : 'study learning'],
  });
}

function mnemeNoteRecord(entry: MnemeNote): LifeRecord {
  return record({
    key: lifeRecordKey('mneme', 'note', entry.id),
    kind: 'note',
    sourceApp: 'mneme',
    source: 'Mneme',
    sourceId: entry.id,
    at: entry.createdAt,
    title: compact(entry.title) || firstLine(entry.body) || 'Untitled note',
    detail: entry.pinned ? 'Pinned note' : 'Note',
    body: entry.body,
    valueIds: [],
    archived: entry.archived,
    searchParts: [entry.source, entry.kind, entry.transcript?.segments.map((segment) => segment.text).join(' ')],
  });
}

function mnemeIdeaRecord(entry: MnemeIdea): LifeRecord {
  const title = firstLine(entry.text) || 'Untitled idea';
  const stage = ({ spark: 'New idea', shape: 'Developing', next: 'Next step', parked: 'Later' } as const)[entry.stage];
  return record({
    key: lifeRecordKey('mneme', 'idea', entry.id),
    kind: 'idea',
    sourceApp: 'mneme',
    source: 'Mneme',
    sourceId: entry.id,
    at: entry.createdAt,
    title,
    detail: stage,
    body: entry.text,
    valueIds: [],
    archived: false,
    searchParts: [entry.stage],
  });
}

type PoreiaAdapterInput = {
  trips: readonly Trip[];
  journal: readonly JournalEntry[];
  today: string;
};

function poreiaRecords(input: PoreiaAdapterInput): LifeRecord[] {
  const completed = input.trips.filter((trip) => phaseOf(trip, input.today).kind === 'past');
  const completedById = new Map(completed.map((trip) => [trip.id, trip]));
  const destinations = (trip: Trip) => placesOf(trip).map((stop) =>
    stop.place.label || [stop.place.name, stop.place.country].filter(Boolean).join(', '),
  );
  const trips = completed.map((trip) => {
    const places = destinations(trip);
    const day = trip.end ?? trip.start!;
    return record({
      key: lifeRecordKey('poreia', 'trip', trip.id),
      kind: 'trip',
      sourceApp: 'poreia',
      source: 'Poreia',
      sourceId: trip.id,
      at: `${day}T12:00:00`,
      title: trip.name,
      detail: join(places.join(' → '), trip.start && trip.end ? `${trip.start} – ${trip.end}` : trip.start),
      body: trip.notes,
      valueIds: [],
      archived: false,
      searchParts: [trip.name, ...places, ...placesOf(trip).map((stop) => stop.place.countryCode)],
    });
  });
  const journal = input.journal
    .filter((entry) => completedById.has(entry.tripId))
    .map((entry) => {
      const trip = completedById.get(entry.tripId)!;
      const places = destinations(trip);
      const kind = entry.kind === 'memory' ? 'Memory' : entry.kind === 'day' ? 'Day log' : 'Travel note';
      return record({
        key: lifeRecordKey('poreia', 'trip', entry.id, 'journal'),
        kind: 'trip',
        sourceApp: 'poreia',
        source: 'Poreia',
        sourceId: entry.id,
        at: `${entry.date}T12:00:00`,
        title: compact(entry.title) || compact(entry.place) || `${trip.name} journal`,
        detail: join(trip.name, kind, entry.place),
        body: entry.text,
        valueIds: [],
        archived: false,
        searchParts: [trip.name, ...places, entry.place, entry.kind],
      });
    });
  return [...trips, ...journal];
}

function oikonomiaMilestoneRecord(entry: FinancialMilestone): LifeRecord {
  return record({
    key: lifeRecordKey('oikonomia', 'financial', entry.id),
    kind: 'financial',
    sourceApp: 'oikonomia',
    source: 'Oikonomia',
    sourceId: entry.id,
    at: `${entry.date}T12:00:00`,
    title: entry.title,
    detail: 'Financial milestone',
    body: entry.body,
    valueIds: [],
    archived: false,
    searchParts: ['financial progress', 'milestone', 'review'],
  });
}

type AskesisAdapterInput = { workouts: readonly WorkoutRecord[]; unit: 'km' | 'mi' };
type DynamisAdapterInput = { workouts: readonly DynamisWorkout[]; unit: 'kg' | 'lb' };
type CompassAdapterInput = {
  decisions: readonly Decision[];
  pursuits: NonNullable<LifeRecordInput['pursuits']>;
};

/**
 * The registry is the extension point for companion apps. Each adapter owns
 * one projection boundary; the source app's own store remains authoritative.
 */
export const lifeRecordAdapters = {
  reflections: {
    id: 'proairetos.reflections',
    owner: 'proairetos',
    allowOriginOverrides: true,
    kinds: ['reflection'],
    toRecords: (entries: readonly Reflection[]) => entries.map(reflectionRecord),
  } satisfies LifeRecordAdapter<readonly Reflection[]>,
  decisions: {
    id: 'compass.decisions',
    owner: 'compass',
    kinds: ['decision'],
    toRecords: (input: Pick<CompassAdapterInput, 'decisions'>) => input.decisions.map(decisionRecord),
  } satisfies LifeRecordAdapter<Pick<CompassAdapterInput, 'decisions'>>,
  pursuits: {
    id: 'compass.pursuits',
    owner: 'compass',
    kinds: ['pursuit'],
    toRecords: (entries: CompassAdapterInput['pursuits']) => entries.map(pursuitRecord),
  } satisfies LifeRecordAdapter<CompassAdapterInput['pursuits']>,
  lifeItems: {
    id: 'proairetos.life-items',
    owner: 'proairetos',
    kinds: ['life'],
    toRecords: (entries: readonly LifeItem[]) => entries.map(lifeItemRecord),
  } satisfies LifeRecordAdapter<readonly LifeItem[]>,
  askesis: {
    id: 'askesis.workouts',
    owner: 'askesis',
    kinds: ['workout'],
    toRecords: (input: AskesisAdapterInput) => input.workouts.map((entry) => workoutRecord(entry, input.unit)),
  } satisfies LifeRecordAdapter<AskesisAdapterInput>,
  dynamis: {
    id: 'dynamis.workouts',
    owner: 'dynamis',
    kinds: ['workout'],
    toRecords: (input: DynamisAdapterInput) => input.workouts.map((entry) => strengthWorkoutRecord(entry, input.unit)),
  } satisfies LifeRecordAdapter<DynamisAdapterInput>,
  soma: {
    id: 'soma.cooked-meals',
    owner: 'soma',
    kinds: ['meal'],
    toRecords: (entries: NonNullable<LifeRecordInput['recipes']>) => mealRecords(entries),
  } satisfies LifeRecordAdapter<NonNullable<LifeRecordInput['recipes']>>,
  mnemeNotes: {
    id: 'mneme.selected-notes',
    owner: 'mneme',
    kinds: ['note'],
    toRecords: (entries: readonly MnemeNote[]) => entries
      .filter((entry) => entry.inReflect ?? entry.pinned)
      .map(mnemeNoteRecord),
  } satisfies LifeRecordAdapter<readonly MnemeNote[]>,
  mnemeIdeas: {
    id: 'mneme.selected-ideas',
    owner: 'mneme',
    kinds: ['idea'],
    toRecords: (entries: readonly MnemeIdea[]) => entries
      .filter((entry) => entry.inReflect === true)
      .map(mnemeIdeaRecord),
  } satisfies LifeRecordAdapter<readonly MnemeIdea[]>,
  poreia: {
    id: 'poreia.completed-trips-and-journal',
    owner: 'poreia',
    kinds: ['trip'],
    toRecords: poreiaRecords,
  } satisfies LifeRecordAdapter<PoreiaAdapterInput>,
  oikonomia: {
    id: 'oikonomia.selected-financial-milestones',
    owner: 'oikonomia',
    kinds: ['financial'],
    toRecords: (entries: readonly FinancialMilestone[]) => entries
      .filter((entry) => entry.inReflect)
      .map(oikonomiaMilestoneRecord),
  } satisfies LifeRecordAdapter<readonly FinancialMilestone[]>,
  theoria: {
    id: 'theoria.study-sessions',
    owner: 'theoria',
    kinds: ['study'],
    toRecords: (entries: readonly StudySession[]) => entries.map(studyRecord),
  } satisfies LifeRecordAdapter<readonly StudySession[]>,
};

/** Builds the shared library projection without changing or duplicating source records. */
export function buildLifeRecords(input: LifeRecordInput): LifeRecord[] {
  return [
    ...lifeRecordAdapters.reflections.toRecords(input.reflections ?? []),
    ...lifeRecordAdapters.decisions.toRecords({ decisions: input.decisions ?? [] }),
    ...lifeRecordAdapters.pursuits.toRecords(input.pursuits ?? []),
    ...lifeRecordAdapters.lifeItems.toRecords(input.items ?? []),
    ...lifeRecordAdapters.askesis.toRecords({ workouts: input.workouts ?? [], unit: input.distanceUnit ?? 'km' }),
    ...lifeRecordAdapters.dynamis.toRecords({ workouts: input.strengthWorkouts ?? [], unit: input.strengthUnit ?? 'kg' }),
    ...lifeRecordAdapters.soma.toRecords(input.recipes ?? []),
    ...lifeRecordAdapters.theoria.toRecords(input.studySessions ?? []),
    ...lifeRecordAdapters.mnemeNotes.toRecords(input.mnemeNotes ?? []),
    ...lifeRecordAdapters.mnemeIdeas.toRecords(input.mnemeIdeas ?? []),
    ...lifeRecordAdapters.poreia.toRecords({
      trips: input.poreiaTrips ?? [],
      journal: input.poreiaJournal ?? [],
      today: input.poreiaToday ?? (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      })(),
    }),
    ...lifeRecordAdapters.oikonomia.toRecords(input.oikonomiaMilestones ?? []),
  ].sort((a, b) => b.at.localeCompare(a.at) || a.key.localeCompare(b.key));
}
