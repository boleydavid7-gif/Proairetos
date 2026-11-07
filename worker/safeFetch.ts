/**
 * Shared care for the two pass-through helpers (calendar files, recipe
 * pages): every hop of a redirect is checked like the first address, bodies
 * are read only up to a limit, and one visitor cannot ask too often.
 */
export const blockedHost = (host: string) =>
  host === 'localhost' ||
  host.endsWith('.local') ||
  host.endsWith('.internal') ||
  /^\d+\.\d+\.\d+\.\d+$/.test(host) ||
  host.includes(':') ||
  host.startsWith('[');

const MAX_REDIRECTS = 5;

type Allowed = (target: URL) => boolean;

/** Fetches a page, following redirects by hand so each new address is checked. */
export async function fetchChecked(
  start: URL,
  init: RequestInit,
  allowed: Allowed,
  fetchImpl: typeof fetch = fetch,
): Promise<{ response: Response; url: string } | { refused: true }> {
  let target = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const response = await fetchImpl(target.toString(), { ...init, redirect: 'manual' });
    const next = response.status >= 300 && response.status < 400 ? response.headers.get('location') : null;
    if (!next) return { response, url: target.toString() };
    let following: URL;
    try {
      following = new URL(next, target);
    } catch {
      return { refused: true };
    }
    if (!allowed(following) || blockedHost(following.hostname)) return { refused: true };
    target = following;
  }
  return { refused: true };
}

/** The body as text, or null when it runs past the limit. Stops reading as soon as it does. */
export async function readCapped(response: Response, maxBytes: number): Promise<string | null> {
  if (!response.body) {
    const text = await response.text();
    return text.length > maxBytes ? null : text;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const seen = new Map<string, { start: number; count: number }>();

/** True when this visitor has asked too often lately. Kept in memory only, per server instance. */
export function tooOften(request: Request, now = Date.now()): boolean {
  const who = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const entry = seen.get(who);
  if (!entry || now - entry.start > WINDOW_MS) {
    if (seen.size > 5000) seen.clear();
    seen.set(who, { start: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

export function resetRateLimit() {
  seen.clear();
}
