import { describe, expect, it, vi } from 'vitest';
import { handleCalendarRequest } from '../../../worker/calendarProxy';
import { resetRateLimit } from '../../../worker/safeFetch';

const ask = (url: string) => new Request(`https://proairetos.com/api/calendar?url=${encodeURIComponent(url)}`);
const calendar = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n';

describe('calendar bridge', () => {
  it('passes a calendar file through, turning webcal into https', async () => {
    const fetchImpl = vi.fn(async () => new Response(calendar, { status: 200 }));
    const response = await handleCalendarRequest(ask('webcal://p01-caldav.icloud.com/published/2/abc'), fetchImpl as unknown as typeof fetch);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(calendar);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect((fetchImpl.mock.calls[0] as unknown[])[0]).toBe('https://p01-caldav.icloud.com/published/2/abc');
  });

  it('returns nothing that is not a calendar', async () => {
    const fetchImpl = vi.fn(async () => new Response('<html>secret page</html>', { status: 200 }));
    const response = await handleCalendarRequest(ask('https://example.com/page'), fetchImpl as unknown as typeof fetch);
    expect(response.status).toBe(422);
    expect(await response.text()).not.toContain('secret');
  });

  it('refuses plain http, local addresses, and bare IPs without fetching', async () => {
    const fetchImpl = vi.fn();
    for (const url of ['http://example.com/a.ics', 'https://localhost/a.ics', 'https://10.0.0.1/a.ics', 'not a link']) {
      expect((await handleCalendarRequest(ask(url), fetchImpl as unknown as typeof fetch)).status).toBe(400);
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('refuses very large files', async () => {
    const fetchImpl = vi.fn(async () => new Response('x', { headers: { 'content-length': '9000000' } }));
    expect((await handleCalendarRequest(ask('https://example.com/a.ics'), fetchImpl as unknown as typeof fetch)).status).toBe(413);
  });
});

describe('calendar bridge care', () => {
  it('checks every redirect hop, not just the first address', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 302, headers: { location: 'https://10.0.0.1/a.ics' } }));
    const response = await handleCalendarRequest(ask('https://example.com/a.ics'), fetchImpl as unknown as typeof fetch);
    expect(response.status).toBe(400);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('follows a safe redirect', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: 'https://cal.example.org/b.ics' } }))
      .mockResolvedValueOnce(new Response(calendar, { status: 200 }));
    const response = await handleCalendarRequest(ask('https://example.com/a.ics'), fetchImpl as unknown as typeof fetch);
    expect(response.status).toBe(200);
  });

  it('stops reading a body that runs past the limit even without a length header', async () => {
    const big = new ReadableStream({
      start(controller) {
        for (let i = 0; i < 4; i += 1) controller.enqueue(new Uint8Array(1_000_000));
        controller.close();
      },
    });
    const fetchImpl = vi.fn(async () => new Response(big, { status: 200 }));
    expect((await handleCalendarRequest(ask('https://example.com/a.ics'), fetchImpl as unknown as typeof fetch)).status).toBe(413);
  });

  it('slows a visitor who asks too often', async () => {
    resetRateLimit();
    const fetchImpl = vi.fn(async () => new Response(calendar, { status: 200 }));
    let last = 200;
    for (let i = 0; i < 35; i += 1) {
      last = (await handleCalendarRequest(ask('https://example.com/a.ics'), fetchImpl as unknown as typeof fetch)).status;
    }
    expect(last).toBe(429);
    resetRateLimit();
  });
});
