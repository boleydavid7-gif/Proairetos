import PostalMime from 'postal-mime';
import { sealForInbox, type CaptureEnv } from './capture';

/*
 * Poreia's forwarding address. Email Routing sends mail for trips.<token>@ the site to this Worker; the email is read
 * here (subject, sender, plain words, and any schema.org booking data in the HTML), sealed at once with the public key
 * the person's device made, and only the sealed copy is kept until Poreia opens it. Nothing is logged or forwarded.
 * Needs SUPABASE_URL and SUPABASE_ANON_KEY (as Capture from anywhere) and the migration 20261027000000_trip_inbox.sql.
 */

/** The parts of Cloudflare's incoming email this uses. */
export type IncomingEmail = {
  from: string;
  to: string;
  raw: ReadableStream<Uint8Array>;
  rawSize: number;
  setReject(reason: string): void;
};

export type MailWords = { s: string; f: string; t: string; j?: string; at: string };

const MAX_RAW = 4 * 1024 * 1024;
const MAX_TEXT = 24_000;
const MAX_JSON = 24_000;

/** "trips.k3x…@proairetos.com" → the token, or undefined for any other address. */
export function tokenFrom(address: string): string | undefined {
  const local = address.trim().toLowerCase().split('@')[0] ?? '';
  const match = /^trips[.+-]([a-z2-7]{26,40})$/.exec(local);
  return match?.[1];
}

/** HTML as plain words: scripts and styles dropped, blocks on their own lines, entities read. */
export function htmlText(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6]|table|section)>/gi, '\n')
    .replace(/<\/t[dh]>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

/** The booking data airlines and hotels put in their emails (schema.org JSON-LD), as found. */
export function jsonLdIn(html: string): string {
  const blocks = [...html.matchAll(/<script[^>]*type=["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1].trim());
  return blocks.join('\n');
}

/** What is kept of one email: subject, sender, words and booking data, each trimmed to fit. */
export function mailWords(parsed: { subject?: string; from?: { address?: string; name?: string }; text?: string; html?: string }, at = new Date()): MailWords {
  const html = parsed.html ?? '';
  const text = (parsed.text?.trim() || htmlText(html)).slice(0, MAX_TEXT);
  const json = jsonLdIn(html).slice(0, MAX_JSON);
  return { s: (parsed.subject ?? '').slice(0, 300), f: (parsed.from?.name || parsed.from?.address || '').slice(0, 200), t: text, ...(json ? { j: json } : {}), at: at.toISOString() };
}

export async function handleTripEmail(message: IncomingEmail, env: CaptureEnv, fetchImpl: typeof fetch = fetch): Promise<void> {
  const token = tokenFrom(message.to);
  if (!token) {
    message.setReject('Unknown address');
    return;
  }
  if (message.rawSize > MAX_RAW) {
    message.setReject('Too large');
    return;
  }
  const base = env.SUPABASE_URL?.trim().replace(/(\/rest\/v1)?\/*$/, '');
  const key = env.SUPABASE_ANON_KEY?.trim();
  if (!base || !key) {
    message.setReject('Not set up');
    return;
  }
  const rpc = (name: string, args: Record<string, string>) =>
    fetchImpl(`${base}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify(args),
    });
  const found = await rpc('trip_inbox_key', { token });
  const publicJwk = found.ok ? ((await found.json()) as JsonWebKey | null) : null;
  if (!publicJwk) {
    message.setReject('Unknown address');
    return;
  }
  const parsed = await PostalMime.parse(await new Response(message.raw).arrayBuffer());
  const sealed = await sealForInbox(publicJwk, mailWords(parsed), 'poreia-mail');
  const kept = await rpc('trip_inbox_add', { token, sealed });
  if (!kept.ok || (await kept.json()) !== true) message.setReject('Inbox full; open Poreia to empty it');
}
