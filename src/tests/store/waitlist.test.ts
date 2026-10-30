import { beforeEach, describe, expect, it } from 'vitest';
import { handleWaitlistRequest, looksLikeEmail } from '../../../worker/waitlist';
import { resetRateLimit } from '../../../worker/safeFetch';

const env = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon' };

function post(fields: [string, string][], headers: Record<string, string> = {}) {
  const body = new URLSearchParams(fields);
  return new Request('https://proairetos.com/api/waitlist', {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: 'https://proairetos.com', ...headers },
  });
}

function fake(answer: unknown = true, status = 200) {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const fetcher = (async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)) as Record<string, unknown> });
    return new Response(JSON.stringify(answer), { status });
  }) as unknown as typeof fetch;
  return { fetcher, calls };
}

const where = (response: Response) => new URL(response.headers.get('location') ?? '').pathname;

describe('the waitlist', () => {
  beforeEach(() => resetRateLimit());

  it('keeps the email and the apps chosen, then thanks the person', async () => {
    const { fetcher, calls } = fake();
    const response = await handleWaitlistRequest(
      post([['email', ' Reader@Example.com '], ['apps', 'soma'], ['apps', 'phyton'], ['apps', 'soma'], ['apps', 'nonsense'], ['source', 'soma']]),
      env,
      fetcher,
    );
    expect(response.status).toBe(303);
    expect(where(response)).toBe('/welcome/thanks/');
    expect(calls[0].url).toBe('https://x.supabase.co/rest/v1/rpc/join_waitlist');
    expect(calls[0].body).toEqual({ email: 'reader@example.com', apps: ['soma', 'phyton'], source: 'soma' });
  });

  it('asks again for an email that does not look right, or when the server says no', async () => {
    expect(where(await handleWaitlistRequest(post([['email', 'not an email']]), env, fake().fetcher))).toBe('/welcome/try-again/');
    expect(where(await handleWaitlistRequest(post([['email', 'a@b.co']]), env, fake(false).fetcher))).toBe('/welcome/try-again/');
    expect(where(await handleWaitlistRequest(post([['email', 'a@b.co']]), env, fake({}, 500).fetcher))).toBe('/welcome/try-again/');
    expect(where(await handleWaitlistRequest(post([['email', 'a@b.co']]), {}, fake().fetcher))).toBe('/welcome/try-again/');
  });

  it('sends the newsletter yes only when its box was ticked', async () => {
    const ticked = fake();
    await handleWaitlistRequest(post([['email', 'a@b.co'], ['letters', 'yes']]), env, ticked.fetcher);
    expect(ticked.calls[0].body).toEqual({ email: 'a@b.co', apps: [], source: 'welcome', letters: true });
    const left = fake();
    await handleWaitlistRequest(post([['email', 'a@b.co']]), env, left.fetcher);
    expect(left.calls[0].body).not.toHaveProperty('letters');
  });

  it('still keeps the place on the list on a server without the newsletter yet', async () => {
    const calls: Record<string, unknown>[] = [];
    const older = (async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      calls.push(body);
      return 'letters' in body ? new Response('{"message":"no function"}', { status: 404 }) : new Response('true');
    }) as unknown as typeof fetch;
    const response = await handleWaitlistRequest(post([['email', 'a@b.co'], ['letters', 'yes']]), env, older);
    expect(where(response)).toBe('/welcome/thanks/');
    expect(calls).toHaveLength(2);
    expect(calls[1]).not.toHaveProperty('letters');
  });

  it('thanks a bot that fills the hidden field, and keeps nothing', async () => {
    const { fetcher, calls } = fake();
    const response = await handleWaitlistRequest(post([['email', 'a@b.co'], ['website', 'spam.example']]), env, fetcher);
    expect(where(response)).toBe('/welcome/thanks/');
    expect(calls).toHaveLength(0);
  });

  it('takes forms from this site only, and posts only', async () => {
    expect((await handleWaitlistRequest(post([['email', 'a@b.co']], { origin: 'https://elsewhere.example' }), env, fake().fetcher)).status).toBe(403);
    expect((await handleWaitlistRequest(new Request('https://proairetos.com/api/waitlist'), env, fake().fetcher)).status).toBe(404);
  });

  it('knows an email when it sees one', () => {
    expect(looksLikeEmail('a@b.co')).toBe(true);
    expect(looksLikeEmail('a@b')).toBe(false);
    expect(looksLikeEmail('a b@c.co')).toBe(false);
  });
});
