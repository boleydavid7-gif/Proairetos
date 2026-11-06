// Checks what Supabase really does when a session is signed out with scope 'local' and with scope 'global', against a
// THROWAWAY test project and a throwaway account. Never point it at the production project: it signs sessions in and out.
//
//   SUPABASE_URL=https://<test-ref>.supabase.co SUPABASE_ANON_KEY=... TEST_EMAIL=... TEST_PASSWORD=... \
//     ALLOW_TEST_PROJECT=yes node scripts/session-check/scope-check.mjs
//
// Procedure and how to read the result: docs/security-audit/SCOPE_LOCAL_VERIFICATION.md
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
const email = process.env.TEST_EMAIL;
const password = process.env.TEST_PASSWORD;
const PRODUCTION_REF = 'ccxkwfmybtouneurxunj';

if (!url || !anon || !email || !password) throw new Error('Set SUPABASE_URL, SUPABASE_ANON_KEY, TEST_EMAIL and TEST_PASSWORD.');
if (process.env.ALLOW_TEST_PROJECT !== 'yes') throw new Error('Set ALLOW_TEST_PROJECT=yes to confirm this is a throwaway test project.');
if (url.includes(PRODUCTION_REF)) throw new Error('That is the production project. Use a separate test project.');

const results = [];
const check = (name, ok, detail = '') => {
  results.push(Boolean(ok));
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
};
const note = (text) => console.log(`note  ${text}`);

/** A client with its own in-memory session, so two clients are two devices. */
function device() {
  const memory = new Map();
  return createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'check',
      storage: { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: (key) => memory.delete(key) },
    },
  });
}

const claims = (token) => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());

async function signIn(client) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`Could not sign in: ${error?.message ?? 'no session'}`);
  return data.session;
}

/** Whether the server still accepts this access token (it asks the server, which looks the session up). */
async function serverAccepts(token) {
  const { error } = await device().auth.getUser(token);
  return !error;
}

/** Whether this refresh token still works. */
async function refreshWorks(refreshToken) {
  const { error } = await device().auth.refreshSession({ refresh_token: refreshToken });
  return !error;
}

try {
  // ---- scope: local ----
  const a = device();
  const b = device();
  const sessionA = await signIn(a);
  const sessionB = await signIn(b);
  check('two sign-ins are two different sessions', claims(sessionA.access_token).session_id !== claims(sessionB.access_token).session_id);
  check('both sessions are accepted before anything is signed out', (await serverAccepts(sessionA.access_token)) && (await serverAccepts(sessionB.access_token)));

  const { error: localError } = await a.auth.signOut({ scope: 'local' });
  check('signOut({ scope: "local" }) on device A returns no error', !localError, localError?.message);

  check('device A: the server no longer accepts its access token', !(await serverAccepts(sessionA.access_token)));
  check('device A: its refresh token no longer works', !(await refreshWorks(sessionA.refresh_token)));
  check('device B: its access token is still accepted (another device was not signed out)', await serverAccepts(sessionB.access_token));
  const { data: refreshedB, error: refreshErrorB } = await b.auth.refreshSession();
  check('device B: its refresh token still works', !refreshErrorB && Boolean(refreshedB.session), refreshErrorB?.message);

  // What the data API does with the access token of a session that was signed out: it is a signed token, so the
  // data API may keep accepting it until it expires, even though the auth server no longer does.
  const secondsLeft = claims(sessionA.access_token).exp - Math.floor(Date.now() / 1000);
  const rest = await fetch(`${url}/rest/v1/user_keys?select=user_id&limit=1`, { headers: { apikey: anon, authorization: `Bearer ${sessionA.access_token}` } });
  if (rest.status === 200) note(`the data API still accepted device A's old access token (${secondsLeft} s until it expires). Expected: a signed-out session's token works there until it expires.`);
  else if (rest.status === 401 || rest.status === 403) note(`the data API refused device A's old access token (status ${rest.status}).`);
  else note(`the data API answered ${rest.status} for device A's old access token (the project may not have the app's tables).`);

  // ---- scope: global ----
  const c = device();
  const sessionC = await signIn(c);
  const refreshedSessionB = (await b.auth.getSession()).data.session ?? refreshedB.session;
  check('a third device is signed in and device B is still signed in', (await serverAccepts(sessionC.access_token)) && (await serverAccepts(refreshedSessionB.access_token)));
  const { error: globalError } = await c.auth.signOut({ scope: 'global' });
  check('signOut({ scope: "global" }) on device C returns no error', !globalError, globalError?.message);
  check('device C: its access token is no longer accepted', !(await serverAccepts(sessionC.access_token)));
  check('device B: its access token is no longer accepted either', !(await serverAccepts(refreshedSessionB.access_token)));
  check('device B: its refresh token no longer works', !(await refreshWorks(refreshedSessionB.refresh_token)));
} catch (cause) {
  console.log(`FAIL  the check could not finish: ${cause instanceof Error ? cause.message : cause}`);
  results.push(false);
}

const passed = results.filter(Boolean).length;
console.log(`\n${passed} of ${results.length} passed.`);
process.exit(passed === results.length ? 0 : 1);
