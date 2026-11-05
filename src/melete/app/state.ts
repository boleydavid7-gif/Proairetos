import { collection, stored } from '../../app/family/shell';
import type { StudySession, Subject } from '../core/subjects';

export type MeleteSettings = { started: boolean; minutes: number };

export const settings = stored<MeleteSettings>('melete:settings', () => ({ started: true, minutes: 45 }));
export const subjects = collection<Subject>('melete:subject:');
export const sessions = collection<StudySession>('melete:session:');

export const newId = (prefix = 'subject') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** A subject goes with its sessions, and comes back with them on undo. */
export function removeSubject(subject: Subject): () => void {
  const its = sessions.list().filter((session) => session.subjectId === subject.id);
  subjects.remove(subject.id);
  its.forEach((session) => sessions.remove(session.id));
  return () => {
    subjects.put(subject);
    its.forEach((session) => sessions.put(session));
  };
}

/** The sitting now under way, on this device only (it is not a record, and not in backups). */
const RUNNING = 'meleteRunning';
export type Running = { sessionId?: string; subjectId?: string; kind: StudySession['kind']; startedAt: number; minutes: number };

export function loadRunning(): Running | null {
  try {
    const raw = localStorage.getItem(RUNNING);
    return raw ? (JSON.parse(raw) as Running) : null;
  } catch {
    return null;
  }
}

export function saveRunning(running: Running | null): void {
  try {
    if (running) localStorage.setItem(RUNNING, JSON.stringify(running));
    else localStorage.removeItem(RUNNING);
  } catch {
    // The sitting still runs without storage; it is only not kept across a reload.
  }
}
