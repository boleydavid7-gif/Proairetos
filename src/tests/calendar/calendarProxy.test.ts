import { describe, expect, it, vi } from 'vitest';
import { handleCalendarRequest } from '../../../worker/calendarProxy';

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
