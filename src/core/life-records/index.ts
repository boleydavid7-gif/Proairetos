import type { Decision } from '../decisions/types';
import type { LifeItem } from '../life-items/types';
import type { Reflection } from '../reflections/types';

export type LifeRecordKind = 'reflection' | 'decision' | 'pursuit' | 'life' | 'workout' | 'meal' | 'study';
export type LifeRecordSource = 'Proairetos' | 'Compass' | 'Askesis' | 'Soma' | 'Theoria';

/**
 * A read-only, searchable view of something the person recorded or did.
 * The source record remains authoritative; this is only a common projection
 * for Reflect and the personal library.
 */
export interface LifeRecord {
  key: string;
  kind: LifeRecordKind;
  source: LifeRecordSource;
  sourceId: string;
  at: string;
  title: string;
  detail?: string;
  body?: string;
  searchText: string;
  valueIds: string[];
  archived: boolean;
}

export interface LifeRecordInput {
  reflections?: readonly Reflection[];
  decisions?: readonly Decision[];
  pursuits?: readonly {
    id: string; title: string; status: 'active' | 'paused' | 'complete' | 'archived';
    area?: string; outcome?: string; why?: string; current?: string; friction?: string; approach?: string; reviewNote?: string; nextMove?: string;
    valueNotes?: Record<string, string>; createdAt: string;
  }[];
  items?: readonly LifeItem[];
  workouts?: readonly {
    id: string; date: string; activity: 'run' | 'walk' | 'hike' | 'bike' | 'other';
    createdAt: string; seconds?: number; meters?: number; felt?: string; notes?: string;
    wentWell?: string; nextTime?: string; intention?: string; workoutTitle?: string;
  }[];
  recipes?: readonly {
    id: string; title: string; notes?: string; tags?: string[]; ingredients?: string[];
    source?: string; cookedFor?: Record<string, string[]>;
  }[];
  distanceUnit?: 'km' | 'mi';
  studySessions?: readonly {
    id: string; itemId: string; title: string; minutes: number; at: string; kind: 'study' | 'reading';
  }[];
}

const compact = (value: string | undefined) => value?.trim() ?? '';
const firstLine = (value: string) => value.trim().split(/\r?\n/, 1)[0].slice(0, 92);
const join = (...parts: Array<string | undefined>) => parts.map(compact).filter(Boolean).join(' · ');
const record = (
  input: Omit<LifeRecord, 'searchText'> & { searchParts?: string[] },
): LifeRecord => {
  const { searchParts = [], ...rest } = input;
  return { ...rest, searchText: [rest.title, rest.detail, rest.body, rest.source, ...searchParts].filter(Boolean).join(' ').toLocaleLowerCase() };
};

function reflectionRecord(entry: Reflection): LifeRecord {
  const kind = entry.kind === 'INTENTION' ? 'Daily intention' : entry.kind.replaceAll('_', ' ').toLocaleLowerCase();
  const prompt = entry.promptKey?.replaceAll('-', ' ');
  return record({
    key: `reflection:${entry.id}`,
    kind: 'reflection',
    source: 'Proairetos',
    sourceId: entry.id,
    at: entry.createdAt,
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
    source: 'Compass',
    sourceId: entry.id,
    at: entry.decidedAt,
    title: entry.question,
    detail: `Chose: ${entry.choice}`,
    body: join(entry.reasons, entry.expected ? `Expected: ${entry.expected}` : undefined),
    valueIds: Object.keys(entry.valueNotes ?? {}),
    archived: Boolean(entry.archivedAt),
    searchParts: entry.options,
  });
}

type PursuitRecord = NonNullable<LifeRecordInput['pursuits']>[number];
type WorkoutRecord = NonNullable<LifeRecordInput['workouts']>[number];

function pursuitRecord(entry: PursuitRecord): LifeRecord {
  const status = entry.status === 'complete' ? 'Complete' : entry.status === 'paused' ? 'Paused' : entry.status === 'archived' ? 'Archived' : 'Active';
  return record({
    key: `pursuit:${entry.id}`,
    kind: 'pursuit',
    source: 'Compass',
    sourceId: entry.id,
    at: entry.createdAt,
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
    source: 'Proairetos',
    sourceId: entry.id,
    at: entry.createdAt,
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

function mealRecords(recipes: NonNullable<LifeRecordInput['recipes']>): LifeRecord[] {
  return recipes.flatMap((recipe) =>
    Object.entries(recipe.cookedFor ?? {})
      .filter(([, people]) => people.length > 0)
      .map(([day, people]) => {
        const who = people.length <= 1 ? people[0] : `${people.slice(0, -1).join(', ')} and ${people.at(-1)}`;
        return record({
          key: `meal:${recipe.id}@${day}`,
          kind: 'meal',
          source: 'Soma',
          sourceId: recipe.id,
          at: `${day}T23:59:00`,
          title: recipe.title,
          detail: `Cooked for ${who}`,
          body: recipe.notes,
          valueIds: [],
          archived: false,
          searchParts: [day, ...recipe.tags, ...recipe.ingredients, recipe.source],
        });
      }),
  );
}

function studyRecord(entry: NonNullable<LifeRecordInput['studySessions']>[number]): LifeRecord {
  const reading = entry.kind === 'reading';
  return record({
    key: `study:${entry.id}`,
    kind: 'study',
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

/** Builds the shared library projection without changing or duplicating source records. */
export function buildLifeRecords(input: LifeRecordInput): LifeRecord[] {
  return [
    ...(input.reflections ?? []).map(reflectionRecord),
    ...(input.decisions ?? []).map(decisionRecord),
    ...(input.pursuits ?? []).map(pursuitRecord),
    ...(input.items ?? []).map(lifeItemRecord),
    ...(input.workouts ?? []).map((entry) => workoutRecord(entry, input.distanceUnit ?? 'km')),
    ...mealRecords(input.recipes ?? []),
    ...(input.studySessions ?? []).map(studyRecord),
  ].sort((a, b) => b.at.localeCompare(a.at) || a.key.localeCompare(b.key));
}
