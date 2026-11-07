/**
 * An optional passcode for Reflect, Journal and the pages under them. It keeps casual eyes out on a shared
 * phone; it is not encryption (backups and sync have their own protection). Off unless the person turns it on,
 * and stored on this device only (never in backups or sync).
 */

const KEY = 'proairetos.lock';
/** Locks again after the app has been out of sight this long. */
const AWAY_MS = 60_000;
const ROUNDS = 150_000;

type Stored = { salt: string; hash: string };
type Listener = () => void;

function read(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Stored>;
    return typeof parsed.salt === 'string' && typeof parsed.hash === 'string' ? (parsed as Stored) : null;
  } catch {
    return null;
  }
}

const toHex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');

async function derive(code: string, salt: string): Promise<string> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: ROUNDS },
    material,
    256,
  );
  return toHex(bits);
}

export const validCode = (code: string) => /^\d{4,8}$/.test(code);

let locked = read() !== null;
let hiddenAt = 0;
const listeners = new Set<Listener>();
const tell = () => listeners.forEach((listener) => listener());

export const lock = {
  isOn: () => read() !== null,
  isLocked: () => locked,
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  async turnOn(code: string): Promise<void> {
    if (!validCode(code)) throw new Error('Use 4 to 8 digits.');
    const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
    localStorage.setItem(KEY, JSON.stringify({ salt, hash: await derive(code, salt) }));
    // The person just chose it, so they are in.
    locked = false;
    tell();
  },

  async check(code: string): Promise<boolean> {
    const stored = read();
    if (!stored) return true;
    return (await derive(code, stored.salt)) === stored.hash;
  },

  /** True when the code was right (the lock opens). */
  async unlock(code: string): Promise<boolean> {
    if (!(await lock.check(code))) return false;
    locked = false;
    tell();
    return true;
  },

  lockNow() {
    if (!lock.isOn()) return;
    locked = true;
    tell();
  },

  /** Removes the lock. The person's writing is untouched. */
  turnOff() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // Nothing to remove if storage is unavailable.
    }
    locked = false;
    tell();
  },

  /** Locks again after the app has been away for a minute. Call once at start. */
  watchAway(): () => void {
    const onChange = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > AWAY_MS) lock.lockNow();
      if (document.visibilityState === 'visible') hiddenAt = 0;
    };
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  },
};

/** The pages that hold reflections. */
export const lockedRoutes: readonly string[] = ['reflect', 'journal', 'insights', 'review'];
