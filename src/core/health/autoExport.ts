/*
 * Apple Health, as Health Auto Export sends it (its REST API automation, or a JSON file it saved): only what the
 * family's apps keep is read, and everything else in the export is left out. Workouts (runs, walks, hikes, rides) for
 * Askesis, nights of sleep for Diaita, water for Hydros, and readings (weight, blood pressure, blood sugar, temperature,
 * resting heart rate, oxygen) for Therapeia. Times are kept as the phone wrote them, so a local date stays local.
 */

export type HealthWorkout = { id: string; type: string; date: string; at: string; seconds?: number; meters?: number; avgHr?: number };
/** A night: the day woken into, and bed and up as "HH:MM". */
export type HealthSleep = { date: string; bed: string; up: string };
/** Water drunk. An amount the export added up for a day (or an hour) keeps one id, so a later, larger total replaces it. */
export type HealthWater = { id: string; at: string; ml: number };
export type HealthReadingKind = 'weight' | 'blood-pressure' | 'blood-sugar' | 'temperature' | 'heart-rate' | 'oxygen';
export type HealthReading = { id: string; kind: HealthReadingKind; at: string; value: number; value2?: number; unit: string };

export type HealthBatch = { workouts: HealthWorkout[]; sleep: HealthSleep[]; water: HealthWater[]; readings: HealthReading[] };

export const emptyBatch = (): HealthBatch => ({ workouts: [], sleep: [], water: [], readings: [] });

export const batchSize = (batch: HealthBatch) => batch.workouts.length + batch.sleep.length + batch.water.length + batch.readings.length;

type Moment = { iso: string; date: string; time: string; ms: number };

/** "2026-10-22 07:05:00 -0700", "2026-10-22T07:05:00Z" or "2026-10-22 07:05:00": the wall date and time, and the instant. */
export function readMoment(value: unknown): Moment | undefined {
  if (typeof value !== 'string') return undefined;
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*(Z|[+-]\d{2}:?\d{2})?$/.exec(value.trim());
  if (!match) return undefined;
  const [, date, hours, minutes, seconds = '00', zone] = match;
  const offset = !zone ? '' : zone === 'Z' ? 'Z' : `${zone.slice(0, 3)}:${zone.slice(-2)}`;
  const ms = Date.parse(`${date}T${hours}:${minutes}:${seconds}${offset}`);
  if (!Number.isFinite(ms)) return undefined;
  return { iso: new Date(ms).toISOString(), date, time: `${hours}:${minutes}`, ms };
}

const number = (value: unknown): number | undefined => {
  const read = typeof value === 'string' ? Number(value) : value;
  return typeof read === 'number' && Number.isFinite(read) ? read : undefined;
};

/** `{ qty, units }` or a plain number. */
const quantity = (value: unknown): { qty: number; units: string } | undefined => {
  if (value && typeof value === 'object') {
    const qty = number((value as { qty?: unknown }).qty);
    return qty === undefined ? undefined : { qty, units: String((value as { units?: unknown }).units ?? '') };
  }
  const qty = number(value);
  return qty === undefined ? undefined : { qty, units: '' };
};

const METERS: Record<string, number> = { m: 1, km: 1000, mi: 1609.344, yd: 0.9144, ft: 0.3048 };

function workoutType(name: string): string | undefined {
  if (/run/i.test(name)) return 'run';
  if (/hik/i.test(name)) return 'hike';
  if (/walk/i.test(name)) return 'walk';
  if (/cycl|bike|ride/i.test(name)) return 'bike';
  return undefined;
}

function readWorkout(raw: Record<string, unknown>): HealthWorkout | undefined {
  const name = String(raw.name ?? raw.workoutActivityType ?? '');
  const type = workoutType(name);
  const start = readMoment(raw.start ?? raw.startDate);
  if (!type || !start) return undefined;
  const end = readMoment(raw.end ?? raw.endDate);
  const duration = quantity(raw.duration);
  // Health Auto Export sends the duration in seconds; a few older exports give minutes as "min".
  const seconds = duration ? (duration.units === 'min' ? duration.qty * 60 : duration.qty) : end ? (end.ms - start.ms) / 1000 : undefined;
  const distance = quantity(raw.distance ?? raw.totalDistance);
  const meters = distance && distance.qty > 0 ? distance.qty * (METERS[distance.units.toLowerCase()] ?? 1000) : undefined;
  const heart = raw.heartRate && typeof raw.heartRate === 'object' ? (raw.heartRate as { avg?: unknown }).avg : undefined;
  const avgHr = quantity(raw.avgHeartRate ?? heart)?.qty;
  const id = typeof raw.id === 'string' && raw.id ? raw.id : `${start.iso}-${type}`;
  return {
    id,
    type,
    date: start.date,
    at: start.iso,
    seconds: seconds && seconds > 0 ? Math.round(seconds) : undefined,
    meters: meters ? Math.round(meters) : undefined,
    avgHr: avgHr && avgHr > 0 ? Math.round(avgHr) : undefined,
  };
}

type Piece = { start: Moment; end: Moment; stage: string };

/** Separate stages of sleep (one row each) joined into nights: pieces less than two hours apart are one night. */
function nightsFrom(pieces: Piece[]): HealthSleep[] {
  const asleep = pieces.filter((piece) => !/awake|in ?bed/i.test(piece.stage) && piece.end.ms > piece.start.ms);
  const use = asleep.length ? asleep : pieces.filter((piece) => /in ?bed/i.test(piece.stage));
  const sorted = [...use].sort((a, b) => a.start.ms - b.start.ms);
  const nights: { start: Moment; end: Moment }[] = [];
  for (const piece of sorted) {
    const last = nights[nights.length - 1];
    if (last && piece.start.ms - last.end.ms < 2 * 3_600_000) {
      if (piece.end.ms > last.end.ms) last.end = piece.end;
    } else nights.push({ start: piece.start, end: piece.end });
  }
  return nights.map((night) => ({ date: night.end.date, bed: night.start.time, up: night.end.time, minutes: (night.end.ms - night.start.ms) / 60_000 }))
    .filter((night) => night.minutes >= 60)
    .map(({ date, bed, up }) => ({ date, bed, up }));
}

/** Nights from separate pieces of sleep, one a day woken into (the longest). */
function readSleepPieces(pieces: Piece[]): HealthSleep[] {
  return longestPerDay(nightsFrom(pieces));
}

function readSleep(rows: Record<string, unknown>[]): HealthSleep[] {
  const nights: HealthSleep[] = [];
  const pieces: Piece[] = [];
  for (const row of rows) {
    // Added up by night: when sleep began and ended (or, without them, time in bed).
    const start = readMoment(row.sleepStart) ?? readMoment(row.inBedStart);
    const end = readMoment(row.sleepEnd) ?? readMoment(row.inBedEnd);
    if (start && end && end.ms - start.ms >= 3_600_000) {
      nights.push({ date: end.date, bed: start.time, up: end.time });
      continue;
    }
    // One row a stage.
    const from = readMoment(row.startDate ?? row.start);
    const until = readMoment(row.endDate ?? row.end);
    if (from && until) pieces.push({ start: from, end: until, stage: String(row.value ?? row.stage ?? 'Asleep') });
  }
  nights.push(...nightsFrom(pieces));
  return longestPerDay(nights);
}

/** One night per day woken into: the longest. */
function longestPerDay(nights: HealthSleep[]): HealthSleep[] {
  const byDate = new Map<string, HealthSleep>();
  const length = (night: HealthSleep) => {
    const [bh, bm] = night.bed.split(':').map(Number);
    const [uh, um] = night.up.split(':').map(Number);
    const minutes = uh * 60 + um - (bh * 60 + bm);
    return minutes <= 0 ? minutes + 1440 : minutes;
  };
  for (const night of nights) {
    const kept = byDate.get(night.date);
    if (!kept || length(night) > length(kept)) byDate.set(night.date, night);
  }
  return [...byDate.values()];
}

const ML: Record<string, number> = { ml: 1, l: 1000, fl_oz_us: 29.5735, 'fl oz': 29.5735, floz: 29.5735, oz: 29.5735, cup_us: 236.588, cup: 236.588, fl_oz_imp: 28.4131 };

function readWater(rows: Record<string, unknown>[], units: string): HealthWater[] {
  const per = ML[units.toLowerCase()] ?? 1;
  const water: HealthWater[] = [];
  for (const row of rows) {
    const at = readMoment(row.date ?? row.startDate);
    const qty = number(row.qty);
    if (!at || !qty || qty <= 0) continue;
    // A row added up for a whole day carries midnight; it stands at noon so the day it belongs to is clear.
    const iso = at.time === '00:00' ? new Date(at.ms + 12 * 3_600_000).toISOString() : at.iso;
    water.push({ id: `water-${at.date}T${at.time}`, at: iso, ml: Math.round(qty * per) });
  }
  return water;
}

function readingUnit(kind: HealthReadingKind, units: string): string {
  const lower = units.toLowerCase();
  if (kind === 'weight') return lower.startsWith('lb') ? 'lb' : 'kg';
  if (kind === 'blood-sugar') return lower.includes('mmol') ? 'mmol/L' : 'mg/dL';
  if (kind === 'temperature') return lower.includes('f') ? '°F' : '°C';
  if (kind === 'blood-pressure') return 'mmHg';
  if (kind === 'heart-rate') return 'bpm';
  return '%';
}

const READING_METRICS: Record<string, HealthReadingKind> = {
  weight_body_mass: 'weight',
  body_mass: 'weight',
  blood_pressure: 'blood-pressure',
  blood_glucose: 'blood-sugar',
  body_temperature: 'temperature',
  resting_heart_rate: 'heart-rate',
  blood_oxygen_saturation: 'oxygen',
  oxygen_saturation: 'oxygen',
};

function readReadings(kind: HealthReadingKind, rows: Record<string, unknown>[], units: string): HealthReading[] {
  const unit = readingUnit(kind, units);
  const out: HealthReading[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const at = readMoment(row.date ?? row.startDate);
    if (!at) continue;
    let value = kind === 'blood-pressure' ? number(row.systolic) : number(row.qty ?? row.Avg ?? row.avg);
    const value2 = kind === 'blood-pressure' ? number(row.diastolic) : undefined;
    if (value === undefined || value <= 0 || (kind === 'blood-pressure' && !value2)) continue;
    // Oxygen comes as a fraction from some sources.
    if (kind === 'oxygen' && value <= 1) value *= 100;
    // A watch or sensor that reads all day: one an hour for blood sugar and oxygen, one a day for resting heart rate.
    const bucket = kind === 'heart-rate' ? at.date : kind === 'blood-sugar' || kind === 'oxygen' ? `${at.date}T${at.time.slice(0, 2)}` : `${at.date}T${at.time}`;
    if (seen.has(bucket)) continue;
    seen.add(bucket);
    out.push({ id: `${kind}-${bucket}`, kind, at: at.iso, value: Math.round(value * 10) / 10, value2: value2 === undefined ? undefined : Math.round(value2), unit });
  }
  return out;
}

// ---------- Android: Health Connect, as Health Connect Webhook (HC Webhook) sends it ----------

/** A UTC instant ("...Z") as the wall time in the phone's zone, when the payload names one. */
function inZone(value: unknown, zone: string | undefined): Moment | undefined {
  const moment = readMoment(value);
  if (!moment || !zone || zone === 'UTC' || typeof value !== 'string' || !value.trim().endsWith('Z')) return moment;
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
        .formatToParts(new Date(moment.ms))
        .map((part) => [part.type, part.value]),
    );
    return { ...moment, date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
  } catch {
    return moment;
  }
}

// Health Connect's exercise and sleep-stage constants, written as numbers (or, in some builds, as words).
const HC_EXERCISE: Record<string, string> = { '56': 'run', '57': 'run', '79': 'walk', '37': 'hike', '8': 'bike', '9': 'bike' };
const HC_AWAKE = new Set(['1', '3', '7', 'awake', 'out_of_bed', 'awake_in_bed']);

const idOf = (row: Record<string, unknown>, fallback: string) => {
  const meta = row.metadata && typeof row.metadata === 'object' ? (row.metadata as { id?: unknown }).id : undefined;
  return typeof meta === 'string' && meta ? meta : fallback;
};

/** Whether a payload is Health Connect Webhook's (snake_case arrays at the top level, no `data`). */
export function isHealthConnectPayload(root: Record<string, unknown>): boolean {
  return !('data' in root) && ['exercise', 'sleep', 'hydration', 'weight', 'blood_pressure', 'blood_glucose', 'oxygen_saturation', 'body_temperature', 'resting_heart_rate', 'app_version'].some((key) => key in root);
}

function readHealthConnect(root: Record<string, unknown>): HealthBatch {
  const batch = emptyBatch();
  const zone = typeof root.timezone === 'string' ? root.timezone : undefined;
  const at = (value: unknown) => inZone(value, zone);

  for (const row of rowsOf(root.exercise)) {
    const raw = String(row.type ?? '').toLowerCase();
    const type = HC_EXERCISE[raw] ?? workoutType(raw);
    const start = at(row.start_time);
    if (!type || !start) continue;
    const end = at(row.end_time);
    const seconds = number(row.duration_seconds) ?? (end ? (end.ms - start.ms) / 1000 : undefined);
    const meters = number(row.distance_meters);
    batch.workouts.push({ id: idOf(row, `${start.iso}-${type}`), type, date: start.date, at: start.iso, seconds: seconds && seconds > 0 ? Math.round(seconds) : undefined, meters: meters && meters > 0 ? Math.round(meters) : undefined });
  }

  const pieces: Piece[] = [];
  for (const row of rowsOf(root.sleep)) {
    const stages = rowsOf(row.stages);
    const asleep = stages.filter((stage) => !HC_AWAKE.has(String(stage.stage ?? '').toLowerCase()));
    for (const stage of asleep) {
      const from = at(stage.start_time);
      const until = at(stage.end_time);
      if (from && until) pieces.push({ start: from, end: until, stage: 'Asleep' });
    }
    if (!asleep.length) {
      // A session without stages: its end and length.
      const end = at(row.session_end_time);
      const seconds = number(row.duration_seconds);
      if (end && seconds) {
        const start = at(new Date(end.ms - seconds * 1000).toISOString());
        if (start) pieces.push({ start, end, stage: 'Asleep' });
      }
    }
  }
  batch.sleep.push(...readSleepPieces(pieces));

  for (const row of rowsOf(root.hydration)) {
    const when = at(row.start_time ?? row.time);
    const liters = number(row.liters);
    if (when && liters && liters > 0) batch.water.push({ id: `water-${idOf(row, `${when.date}T${when.time}`)}`, at: when.iso, ml: Math.round(liters * 1000) });
  }

  const readings: [string, HealthReadingKind, (row: Record<string, unknown>) => number | undefined, string][] = [
    ['weight', 'weight', (row) => number(row.kilograms), 'kg'],
    ['blood_glucose', 'blood-sugar', (row) => number(row.mmol_per_liter), 'mmol'],
    ['oxygen_saturation', 'oxygen', (row) => number(row.percentage ?? row.avg), '%'],
    ['body_temperature', 'temperature', (row) => number(row.celsius), 'degC'],
    ['resting_heart_rate', 'heart-rate', (row) => number(row.bpm), 'count/min'],
  ];
  for (const [key, kind, value, units] of readings) {
    const rows = rowsOf(root[key]).map((row) => ({ date: at(row.time)?.iso, qty: value(row) }));
    batch.readings.push(...readReadings(kind, rows.map((row) => ({ ...row, date: row.date ? localStamp(row.date, zone) : undefined })), units));
  }
  const pressure = rowsOf(root.blood_pressure).map((row) => ({ date: localStamp(at(row.time)?.iso, zone), systolic: row.systolic, diastolic: row.diastolic }));
  batch.readings.push(...readReadings('blood-pressure', pressure, 'mmHg'));
  return batch;
}

/** An instant written back as "YYYY-MM-DD HH:MM:SS +HH:MM" in the phone's zone, the form the readings reader takes. */
function localStamp(iso: string | undefined, zone: string | undefined): string | undefined {
  if (!iso) return undefined;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return undefined;
  const local = inZone(new Date(ms).toISOString(), zone);
  if (!local) return undefined;
  const offset = Math.round((Date.parse(`${local.date}T${local.time}:00Z`) - Math.floor(ms / 60_000) * 60_000) / 60_000);
  const sign = offset < 0 ? '-' : '+';
  const abs = Math.abs(offset);
  return `${local.date} ${local.time}:00 ${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}${String(abs % 60).padStart(2, '0')}`;
}

const rowsOf = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object') : [];

/** What the family keeps from one export. Anything that cannot be read is left out, never guessed. */
export function readHealthExport(json: unknown): HealthBatch {
  const root = json && typeof json === 'object' ? (json as Record<string, unknown>) : {};
  if (isHealthConnectPayload(root)) return readHealthConnect(root);
  const batch = emptyBatch();
  const data = root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : root;
  for (const raw of rowsOf(data.workouts)) {
    const workout = readWorkout(raw);
    if (workout) batch.workouts.push(workout);
  }
  for (const metric of rowsOf(data.metrics)) {
    const name = String(metric.name ?? '').toLowerCase();
    const units = String(metric.units ?? '');
    const rows = rowsOf(metric.data);
    if (name === 'sleep_analysis') batch.sleep.push(...readSleep(rows));
    else if (name === 'dietary_water') batch.water.push(...readWater(rows, units));
    else if (READING_METRICS[name]) batch.readings.push(...readReadings(READING_METRICS[name], rows, units));
  }
  return batch;
}

/**
 * A batch in parts small enough to seal and keep one each (about `maxChars` of JSON, so the sealed copy stays under
 * the inbox's 400,000 characters), newest records first, and at most `maxParts` parts: the Worker may make only so
 * many requests for one export, so a first export with years of history keeps its most recent records.
 */
export function splitBatch(batch: HealthBatch, maxChars = 250_000, maxParts = 40): HealthBatch[] {
  type Entry = { key: keyof HealthBatch; record: HealthBatch[keyof HealthBatch][number]; when: string; size: number }
  const when = (record: Record<string, unknown>) => String(record.at ?? record.date ?? '');
  const entries: Entry[] = (['workouts', 'sleep', 'water', 'readings'] as const)
    .flatMap((key) => (batch[key] as HealthBatch[keyof HealthBatch][number][]).map((record) => ({ key, record, when: when(record as Record<string, unknown>), size: JSON.stringify(record).length + 1 })))
    .sort((a, b) => b.when.localeCompare(a.when));
  const parts: HealthBatch[] = [];
  let part = emptyBatch();
  let chars = 0;
  for (const entry of entries) {
    if (chars + entry.size > maxChars && batchSize(part)) {
      parts.push(part);
      if (parts.length >= maxParts) return parts;
      part = emptyBatch();
      chars = 0;
    }
    (part[entry.key] as HealthBatch[keyof HealthBatch][number][]).push(entry.record);
    chars += entry.size;
  }
  if (batchSize(part)) parts.push(part);
  return parts;
}
