import type { Plant } from '../../phyton/core/plants';
import type { Chore } from '../../ergon/core/chores';
import type { Appointment, Dose } from '../../therapeia/core/medicines';
import type { Upkeep, Due } from '../../ktema/core/things';
import type { TodayPart } from '../../data/storage/preferences';

/*
 * What has come around in the other apps today, as one list for Proairetos Today. Nothing here is stored: the rows
 * are read from each app every time, so a mark made in the app itself, or here, shows everywhere at once and nothing
 * piles up. A day that came earlier reads "Since Tue", never late.
 */

export type FromAppsInput = {
  today: string;
  plants?: readonly { plant: Plant; day: string }[];
  chores?: readonly { chore: Chore; day: string }[];
  doses?: readonly Dose[];
  visits?: readonly Appointment[];
  upkeep?: readonly { upkeep: Upkeep; due: Due; thing?: string }[];
  training?: { name: string; minutes: number };
  /** "Since Tue", "Today": each app says its own days the same way. */
  dayText: (date: string, today: string) => string;
  clock: (at: Date) => string;
};

export type Mark =
  | { kind: 'plant'; plant: Plant }
  | { kind: 'chore'; chore: Chore }
  | { kind: 'dose'; dose: Dose }
  | { kind: 'upkeep'; upkeep: Upkeep };

export type FromAppsRow = {
  key: string;
  app: 'phyton' | 'ergon' | 'therapeia' | 'ktema' | 'dynamis';
  part: TodayPart;
  title: string;
  detail: string;
  /** Where tapping the words goes. */
  href: string;
  /** What ticking it does, and the word for it; absent for rows that only open their app. */
  mark?: Mark;
  done?: string;
};

const open = (app: string, what: string) => `/${app}/?open=${encodeURIComponent(what)}`;
const since = (text: string) => (text === 'Today' ? '' : text);

/** The rows, in a steady order: doses by time, then chores, plants, upkeep, and a training day last. */
export function fromAppsRows(input: FromAppsInput): FromAppsRow[] {
  const { today, dayText, clock } = input;
  const rows: FromAppsRow[] = [];
  for (const dose of [...(input.doses ?? [])].sort((a, b) => a.at.getTime() - b.at.getTime())) {
    rows.push({ key: `dose:${dose.medicine.id}:${dose.slot}`, app: 'therapeia', part: 'medicines', title: dose.medicine.name, detail: [clock(dose.at), dose.medicine.dose, 'Therapeia'].filter(Boolean).join(' · '), href: open('therapeia', `medicine:${dose.medicine.id}`), mark: { kind: 'dose', dose }, done: 'Taken' });
  }
  for (const visit of input.visits ?? []) {
    rows.push({ key: `visit:${visit.id}`, app: 'therapeia', part: 'medicines', title: visit.with, detail: [clock(new Date(visit.at)), visit.where, 'Therapeia'].filter(Boolean).join(' · '), href: open('therapeia', `visit:${visit.id}`) });
  }
  for (const { chore, day } of input.chores ?? []) {
    rows.push({ key: `chore:${chore.id}`, app: 'ergon', part: 'chores', title: chore.name, detail: [since(dayText(day, today)), chore.who, 'Ergon'].filter(Boolean).join(' · '), href: open('ergon', `chore:${chore.id}`), mark: { kind: 'chore', chore }, done: 'Done' });
  }
  for (const { plant, day } of input.plants ?? []) {
    rows.push({ key: `plant:${plant.id}`, app: 'phyton', part: 'plants', title: plant.name, detail: ['Check the soil', since(dayText(day, today)), 'Phyton'].filter(Boolean).join(' · '), href: open('phyton', `plant:${plant.id}`), mark: { kind: 'plant', plant }, done: 'Watered' });
  }
  for (const { upkeep, due, thing } of input.upkeep ?? []) {
    rows.push({ key: `upkeep:${upkeep.id}`, app: 'ktema', part: 'upkeep', title: upkeep.name, detail: [thing, since(dayText(due.date, today)), 'Ktema'].filter(Boolean).join(' · '), href: open('ktema', `upkeep:${upkeep.id}`), mark: { kind: 'upkeep', upkeep }, done: 'Done' });
  }
  if (input.training) {
    rows.push({ key: 'training', app: 'dynamis', part: 'training', title: input.training.name, detail: `About ${input.training.minutes} min · Dynamis`, href: '/dynamis/?open=session' });
  }
  return rows;
}
