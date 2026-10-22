import { describe, expect, it } from 'vitest';
import { handleTripEmail, htmlText, jsonLdIn, mailWords, tokenFrom } from '../../../worker/tripMail';
import { openSealed } from '../../app/capture/inbox';
import { alreadyThere, bookingFrom, readMail, tripFor, type MailWords } from '../../poreia/core/mail';
import type { Trip } from '../../poreia/core/model';

const trip = (id: string, name: string, start?: string, end?: string): Trip => ({ id, name, place: { name }, start, end, travelers: 1, stage: 'idea', createdAt: '', updatedAt: '' });

describe('the forwarding address', () => {
  it('reads the token from the address, whatever case the sender used', () => {
    expect(tokenFrom('trips.abcdefghijklmnopqrstuvwxyz@proairetos.com')).toBe('abcdefghijklmnopqrstuvwxyz');
    expect(tokenFrom('Trips.ABCDEFGHIJKLMNOPQRSTUVWXYZ@Proairetos.com')).toBe('abcdefghijklmnopqrstuvwxyz');
    expect(tokenFrom('hello@proairetos.com')).toBeUndefined();
    expect(tokenFrom('trips.short@proairetos.com')).toBeUndefined();
  });

  it('keeps the words and the booking data from an HTML email', () => {
    const html = '<html><head><style>p{}</style></head><body><p>Your stay&nbsp;is confirmed</p><script type="application/ld+json">{"@type":"LodgingReservation"}</script><p>Code&amp;more</p></body></html>';
    expect(htmlText(html)).toBe('Your stay is confirmed\nCode&more');
    expect(jsonLdIn(html)).toBe('{"@type":"LodgingReservation"}');
    const kept = mailWords({ subject: 'Booked', from: { name: 'Hotel', address: 'a@b.c' }, html }, new Date('2026-10-22T10:00:00Z'));
    expect(kept).toEqual({ s: 'Booked', f: 'Hotel', t: 'Your stay is confirmed\nCode&more', j: '{"@type":"LodgingReservation"}', at: '2026-10-22T10:00:00.000Z' });
  });

  it('seals what arrives for the device and keeps only the sealed copy', async () => {
    const pair = (await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt'])) as CryptoKeyPair;
    const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
    const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
    let kept = '';
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      const args = JSON.parse(String(init?.body)) as { token: string; sealed?: string };
      if (url.endsWith('/trip_inbox_key')) return new Response(JSON.stringify(args.token === 'abcdefghijklmnopqrstuvwxyz' ? publicJwk : null));
      kept = args.sealed ?? '';
      return new Response('true');
    }) as typeof fetch;
    const raw = ['From: TAP Air Portugal <no-reply@flytap.com>', 'To: trips.abcdefghijklmnopqrstuvwxyz@proairetos.com', 'Subject: Your booking ABC123', 'Content-Type: text/plain; charset=utf-8', '', 'Booking reference: ABC123', 'Flight TP208 Newark to Lisbon on Nov 2, 2026 at 6:30 PM', ''].join('\r\n');
    let rejected = '';
    await handleTripEmail(
      { from: 'no-reply@flytap.com', to: 'trips.abcdefghijklmnopqrstuvwxyz@proairetos.com', raw: new Response(raw).body!, rawSize: raw.length, setReject: (reason) => (rejected = reason) },
      { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon' },
      fakeFetch,
    );
    expect(rejected).toBe('');
    expect(kept).not.toContain('ABC123');
    const opened = await openSealed<MailWords>(privateJwk, kept, 'poreia-mail');
    expect(opened.s).toBe('Your booking ABC123');
    expect(opened.f).toBe('TAP Air Portugal');
    expect(opened.t).toContain('TP208');
    // The device reads it into a flight with its code and day.
    const read = readMail(opened, 2026);
    expect(read?.kind).toBe('flight');
    expect(read?.confirmation).toBe('ABC123');
    expect(read?.startDate).toBe('2026-11-02');
  });

  it('turns away an address it does not know', async () => {
    let rejected = '';
    await handleTripEmail(
      { from: 'a@b.c', to: 'someone@proairetos.com', raw: new Response('x').body!, rawSize: 1, setReject: (reason) => (rejected = reason) },
      { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon' },
    );
    expect(rejected).toBe('Unknown address');
  });
});

describe('placing an email on its trip', () => {
  const list = [trip('lis', 'Lisbon', '2026-11-02', '2026-11-08'), trip('rome', 'Rome', '2026-12-10', '2026-12-14'), trip('idea', 'Kyoto')];
  it('finds the trip whose dates hold the booking, else the one trip named in it', () => {
    expect(tripFor({ kind: 'flight', title: '', startDate: '2026-11-01' }, list, '', '2026-10-22')?.id).toBe('lis');
    expect(tripFor({ kind: 'stay', title: '', startDate: '2027-03-01' }, list, 'Your stay in Rome', '2026-10-22')).toBeUndefined();
    expect(tripFor({ kind: 'tour', title: '' }, list, 'A tea ceremony in Kyoto', '2026-10-22')?.id).toBe('idea');
    expect(tripFor({ kind: 'tour', title: '' }, list, 'Lisbon and Rome', '2026-10-22')).toBeUndefined();
  });

  it('knows a booking already there and makes a new one with the subject kept', () => {
    expect(alreadyThere({ kind: 'flight', title: '', confirmation: 'abc123' }, [{ kind: 'flight', confirmation: 'ABC123' }])).toBe(true);
    expect(alreadyThere({ kind: 'flight', title: '', confirmation: 'XYZ' }, [{ kind: 'flight', confirmation: 'ABC123' }])).toBe(false);
    const made = bookingFrom({ kind: 'stay', title: '', provider: 'Marriott', startDate: '2026-11-02' }, 'lis', 'Your reservation', 'b1', 'now');
    expect(made).toMatchObject({ id: 'b1', tripId: 'lis', kind: 'stay', title: 'Marriott', startDate: '2026-11-02', notes: 'From an email: Your reservation' });
  });
});
