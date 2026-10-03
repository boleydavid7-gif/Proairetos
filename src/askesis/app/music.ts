import { useEffect, useState } from 'react';
import { audio, gain } from '../../app/sound/engine';
import { BELL_GAP } from '../core/cues';

/*
 * Songs the runner adds from their phone, kept on this device only (not
 * synced, not in backups), and one player for them. The player goes through
 * the audio clock so it can soften under each bell, and plays as media, so
 * it carries on with the screen locked.
 */
export type Song = { id: string; name: string; type: string; size: number; addedAt: string; blob: Blob };
export type SongInfo = Omit<Song, 'blob'>;

const DB = 'askesis-music';
const STORE = 'songs';

function open(): Promise<IDBDatabase | undefined> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  return open().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) return resolve(undefined);
        const request = work(db.transaction(STORE, mode).objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(undefined);
      }),
  );
}

const listeners = new Set<() => void>();
const changed = () => listeners.forEach((listener) => listener());

export async function listSongs(): Promise<SongInfo[]> {
  const all = (await run('readonly', (s) => s.getAll() as IDBRequest<Song[]>)) ?? [];
  return all.map(({ blob: _blob, ...info }) => info).sort((a, b) => a.addedAt.localeCompare(b.addedAt));
}

const songName = (file: File) => file.name.replace(/\.[a-z0-9]+$/i, '').replace(/[_]+/g, ' ').trim() || 'A song';

export async function addSongs(files: readonly File[]): Promise<number> {
  let added = 0;
  for (const file of files) {
    if (!file.type.startsWith('audio/') && !/\.(mp3|m4a|aac|wav|ogg|oga|opus|flac)$/i.test(file.name)) continue;
    const song: Song = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: songName(file),
      type: file.type || 'audio/mpeg',
      size: file.size,
      addedAt: new Date(Date.now() + added).toISOString(),
      blob: file,
    };
    await run('readwrite', (s) => s.put(song));
    added += 1;
  }
  changed();
  return added;
}

/** Removes a song; the returned function puts it back. */
export async function removeSong(id: string): Promise<() => Promise<void>> {
  const song = await run('readonly', (s) => s.get(id) as IDBRequest<Song | undefined>);
  await run('readwrite', (s) => s.delete(id));
  changed();
  return async () => {
    if (song) await run('readwrite', (s) => s.put(song));
    changed();
  };
}

export function useSongs(): SongInfo[] | undefined {
  const [songs, setSongs] = useState<SongInfo[]>();
  useEffect(() => {
    let live = true;
    const load = () => void listSongs().then((next) => live && setSongs(next));
    load();
    listeners.add(load);
    return () => {
      live = false;
      listeners.delete(load);
    };
  }, []);
  return songs;
}

// ---------- The player ----------

let element: HTMLAudioElement | null = null;
let level: GainNode | null = null;
let queue: string[] = [];
let at = 0;
let url: string | undefined;
let nowPlaying: string | undefined;
const playing = new Set<() => void>();
const told = () => playing.forEach((listener) => listener());

function player(): HTMLAudioElement {
  if (!element) {
    element = new Audio();
    element.setAttribute('playsinline', '');
    element.addEventListener('ended', () => void step(1));
    element.addEventListener('play', told);
    element.addEventListener('pause', told);
    try {
      // Through the audio clock, so it can soften under a bell.
      const ctx = audio();
      level = gain(ctx, 1);
      ctx.createMediaElementSource(element).connect(level);
      level.connect(ctx.destination);
    } catch {
      level = null;
    }
  }
  return element;
}

async function load(index: number): Promise<void> {
  const song = await run('readonly', (s) => s.get(queue[index]) as IDBRequest<Song | undefined>);
  if (!song) return;
  const media = player();
  if (url) URL.revokeObjectURL(url);
  url = URL.createObjectURL(song.blob);
  media.src = url;
  nowPlaying = song.name;
  try {
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: song.name, artist: 'Askesis' });
  } catch {
    // No lock-screen details on this browser.
  }
  told();
  await media.play().catch(() => undefined);
}

async function step(by: number): Promise<void> {
  if (!queue.length) return;
  at = (at + by + queue.length) % queue.length;
  await load(at);
}

/** Starts the songs, from a tap. Returns false when there are none. */
export async function playSongs(shuffle: boolean): Promise<boolean> {
  const ids = (await listSongs()).map((song) => song.id);
  if (!ids.length) return false;
  queue = shuffle ? [...ids].sort(() => Math.random() - 0.5) : ids;
  at = 0;
  await load(0);
  return true;
}

export const skipSong = () => void step(1);

export function pauseSongs(): void {
  element?.pause();
  told();
}

export function resumeSongs(): void {
  if (element?.src) void element.play().catch(() => undefined);
  told();
}

export function stopSongs(): void {
  if (element) {
    element.pause();
    element.removeAttribute('src');
    element.load();
  }
  if (url) URL.revokeObjectURL(url);
  url = undefined;
  nowPlaying = undefined;
  queue = [];
  told();
}

/** The song playing now, if any, kept fresh. */
export function useNowPlaying(): { name?: string; paused: boolean } {
  const read = () => ({ name: nowPlaying, paused: !element || element.paused });
  const [state, setState] = useState(read);
  useEffect(() => {
    const update = () => setState(read());
    playing.add(update);
    return () => {
      playing.delete(update);
    };
  }, []);
  return state;
}

/** Softens the music around a cue at `time` on the audio clock. */
export function duckAt(time: number, bells: number): void {
  if (!level || !nowPlaying) return;
  level.gain.setTargetAtTime(0.3, Math.max(0, time - 0.4), 0.1);
  level.gain.setTargetAtTime(1, time + bells * BELL_GAP + 1.2, 0.4);
}

export function unduck(): void {
  if (!level) return;
  const ctx = audio();
  level.gain.cancelScheduledValues(ctx.currentTime);
  level.gain.setValueAtTime(1, ctx.currentTime);
}
