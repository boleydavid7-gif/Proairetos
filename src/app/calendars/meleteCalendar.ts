import { useMemo, useSyncExternalStore } from 'react';
import { isAdded, subscribeAdded } from '../family/added';
import { onRemoteChanges } from '../sync/syncController';
import type { StudySession, Subject } from '../../melete/core/subjects';
import type { CalendarEvent as DisplayCalendarEvent } from './otherCalendars';

/*
 * Meletē's study sessions, read only, as entries in Today and Days ahead (as long as the person set them), and as time taken
 * for open time and the training offers. Never in the published calendar. Read straight from storage, so Proairetos's
 * first load carries none of Meletē's code.
 */

function records<T>(prefix: string): T[] {
  const out: T[] = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      try {
        out.push(JSON.parse(localStorage.getItem(key) ?? '') as T);
      } catch {
        // An unreadable record is passed over.
      }
    }
  } catch {
    // Storage blocked: nothing to show.
  }
  return out;
}

/** What Meletē holds, read only from storage (the app's own code stays out of Proairetos's first load). */
export const meleteSubjects = () => records<Subject>('melete:subject:');
export const meleteSessions = () => records<StudySession>('melete:session:');

const DATE_WORDS: Record<string, string> = { exam: 'Exam', due: 'Due', other: 'Date' };

/** Subjects' dates (an exam, something due) that fall on one day, each opening the subject in Meletē. */
export function studyDatesOn(subjects: readonly Subject[], date: string): { id: string; name: string; href: string }[] {
  const out: { id: string; name: string; href: string }[] = [];
  for (const subject of subjects) {
    for (const entry of subject.dates ?? []) {
      if (entry.date !== date) continue;
      out.push({ id: `${subject.id}:${entry.id}`, name: `${subject.name}: ${entry.title?.trim() || (DATE_WORDS[entry.kind] ?? 'Date')}`, href: `/melete/?open=subject:${encodeURIComponent(subject.id)}` });
    }
  }
  return out;
}

/** The subjects as they are now; changes (this tab, another tab, sync, adding or removing the app) re-read them. */
export function useMeleteSubjects(enabled: boolean): Subject[] {
  const raw = useSyncExternalStore(meleteCalendar.subscribe, () => (enabled ? subjectsSnapshot() : ''), () => '');
  return useMemo(() => (raw ? (JSON.parse(raw) as Subject[]) : []), [raw]);
}

function subjectsSnapshot(): string {
  return JSON.stringify(meleteSubjects().sort((a, b) => a.id.localeCompare(b.id)));
}

export const meleteCalendar = {
  subscribe(listener: () => void): () => void {
    const onStorage = (event: StorageEvent) => (event.key === null || event.key.startsWith('melete:')) && listener();
    window.addEventListener('storage', onStorage);
    const offRemote = onRemoteChanges(listener);
    const offAdded = subscribeAdded(listener);
    return () => {
      window.removeEventListener('storage', onStorage);
      offRemote();
      offAdded();
    };
  },

  async eventsBetween(from: Date, until: Date): Promise<DisplayCalendarEvent[]> {
    if (!isAdded('melete')) return [];
    const names = new Map(records<Subject>('melete:subject:').map((subject) => [subject.id, subject.name]));
    const out: DisplayCalendarEvent[] = [];
    for (const session of records<StudySession>('melete:session:')) {
      const start = new Date(session.start);
      if (Number.isNaN(start.getTime())) continue;
      const end = new Date(start.getTime() + Math.max(1, session.minutes) * 60_000);
      if (end <= from || start >= until) continue;
      const subject = (session.subjectId && names.get(session.subjectId)) || 'Study';
      out.push({ key: `melete:${session.id}`, title: `${subject} · Study`, start, end, source: 'Meletē', sourceId: 'melete' });
    }
    return out;
  },
};
