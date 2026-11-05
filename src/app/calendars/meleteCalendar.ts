import { isAdded, subscribeAdded } from '../family/added';
import { onRemoteChanges } from '../sync/syncController';
import type { StudySession, Subject } from '../../melete/core/subjects';
import type { CalendarEvent as DisplayCalendarEvent } from './otherCalendars';

/*
 * Meletē's sittings, read only, as entries in Today and Days ahead (as long as the person set them), and as time taken
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

const KINDS: Record<string, string> = { read: 'Read', practice: 'Practice', recall: 'Recall', explain: 'Explain', review: 'Review' };

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
      out.push({ key: `melete:${session.id}`, title: `${subject} · ${KINDS[session.kind] ?? 'Study'}`, start, end, source: 'Meletē', sourceId: 'melete' });
    }
    return out;
  },
};
