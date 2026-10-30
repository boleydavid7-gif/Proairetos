// One transcription at a time, kept going while the app is open even when the note's page is left. The result goes
// into the note: its timed sentences, its text when the note had none, and a title when it was still "Voice note".
import { attachmentService } from '../../../app/services';
import { notes, settings, type Note } from '../state';
import { toMono16k, windowsOf } from './audio';
import { titleFrom, transcriptText } from './segments';
import type { Accuracy, FromWorker, ToWorker } from './worker';

export type Job =
  | { phase: 'waiting' }
  | { phase: 'reading' }
  | { phase: 'downloading'; progress: number }
  | { phase: 'hearing'; done: number; total: number }
  | { phase: 'error'; message: string };

const jobs = new Map<string, Job>();
const listeners = new Set<() => void>();
let queue: string[] = [];
let running = false;
let worker: Worker | null = null;

const tell = () => listeners.forEach((listener) => listener());
const set = (id: string, job: Job | null) => {
  if (job) jobs.set(id, job);
  else jobs.delete(id);
  tell();
};

export const transcription = {
  get: (id: string): Job | undefined => jobs.get(id),
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function transcribeNote(id: string): void {
  if (jobs.has(id) && jobs.get(id)!.phase !== 'error') return;
  set(id, { phase: 'waiting' });
  queue.push(id);
  void next();
}

export function cancelTranscription(id: string): void {
  queue = queue.filter((item) => item !== id);
  if (jobs.get(id)?.phase === 'waiting' || jobs.get(id)?.phase === 'error') set(id, null);
}

function thread(): Worker {
  worker ??= new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  return worker;
}

async function next(): Promise<void> {
  if (running) return;
  const id = queue.shift();
  if (!id) return;
  running = true;
  try {
    await run(id);
  } catch (cause) {
    set(id, { phase: 'error', message: plain(cause) });
  } finally {
    running = false;
    void next();
  }
}

function plain(cause: unknown): string {
  const text = cause instanceof Error ? cause.message : String(cause);
  if (/fetch|network|^load f/i.test(text)) return 'Couldn’t download the speech model. Check the connection and try again.';
  if (/memory|allocation|out of bounds/i.test(text)) return 'This device ran out of memory. Try the standard model.';
  return 'Couldn’t transcribe this recording. Try again.';
}

async function run(id: string): Promise<void> {
  const note = notes.list().find((item) => item.id === id);
  if (!note?.recording) throw new Error('No recording');
  set(id, { phase: 'reading' });
  const files = await attachmentService.forItem(id);
  const file = files.find((item) => item.id === note.recording?.attachmentId && item.data.byteLength > 0);
  if (!file) throw new Error('The recording is not on this device yet.');
  const windows = windowsOf(await toMono16k(file.data));
  const prefs = settings.load();
  const accuracy: Accuracy = prefs.accuracy ?? 'standard';
  const language = note.transcript?.language ?? prefs.language ?? undefined;
  const segments = await new Promise<NonNullable<Note['transcript']>['segments']>((resolve, reject) => {
    const work = thread();
    const listen = (event: MessageEvent<FromWorker>) => {
      const message = event.data;
      if (message.id !== id) return;
      if (message.type === 'download') set(id, { phase: 'downloading', progress: message.progress });
      else if (message.type === 'piece') set(id, { phase: 'hearing', done: message.done, total: message.total });
      else {
        work.removeEventListener('message', listen);
        if (message.type === 'result') resolve(message.segments);
        else reject(new Error(message.message));
      }
    };
    work.addEventListener('message', listen);
    const job: ToWorker = { type: 'run', id, accuracy, language, windows };
    work.postMessage(job, windows.map((window) => window.samples.buffer));
  });
  // The note as it is now: it may have been edited while this ran.
  const now = notes.list().find((item) => item.id === id);
  if (!now) return set(id, null);
  const text = transcriptText(segments);
  const untitled = !now.title.trim() || now.title === 'Voice note';
  notes.put({
    ...now,
    transcript: { segments, language, accuracy, at: new Date().toISOString() },
    body: now.body.trim() ? now.body : text,
    title: untitled && text ? titleFrom(text) || now.title : now.title,
    updatedAt: new Date().toISOString(),
  });
  set(id, null);
}
