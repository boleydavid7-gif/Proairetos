// Answers one question on a THROWAWAY Supabase test project: after a session is signed out (scope 'local'), can the access
// token that was already issued for it still read protected data through the data API?
//
// It needs a table made for the purpose (SQL in docs/security-audit/SCOPE_LOCAL_VERIFICATION.md): `security_session_probe`,
// row level security on, one SELECT policy for the `authenticated` role, no access for `anon`, one harmless row.
//
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... TEST_EMAIL=... TEST_PASSWORD=... ALLOW_TEST_PROJECT=yes \
//     node scripts/session-check/token-after-signout.mjs
//
// It prints status codes, row counts and seconds until expiry. It never prints a password or a token.
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
const email = process.env.TEST_EMAIL;
const password = process.env.TEST_PASSWORD;
const PRODUCTION_REF = 'ccxkwfmybtouneurxunj';
const DELAYS_SECONDS = (process.env.DELAYS ?? '5,30,120').split(',').map(Number);

if (!url || !anon || !email || !password) throw new Error('Set SUPABASE_URL, SUPABASE_ANON_KEY, TEST_EMAIL and TEST_PASSWORD.');
if (process.env.ALLOW_TEST_PROJECT !== 'yes') throw new Error('Set ALLOW_TEST_PROJECT=yes to confirm this is a throwaway test project.');
if (url.includes(PRODUCTION_REF)) throw new Error('That is the production project. Use a separate test project.');

const device = () => {
  const memory = new Map();
  return createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'probe',
      storage: { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: (key) => memory.delete(key) },
    },
  });
};
const claims = (token) => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
const now = () => Math.floor(Date.now() / 1000);
const sleep = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));
const stamp = () => new Date().toISOString().slice(11, 19);

/** The data API: status and how many rows came back. */
async function readRow(label, bearer, { token }) {
  const headers = { apikey: anon };
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  const response = await fetch(`${url}/rest/v1/security_session_probe?select=id`, { headers });
  let rows = '-';
  try {
    const body = await response.json();
    rows = Array.isArray(body) ? body.length : '-';
  } catch {
    // No body.
  }
  const left = token ? `${claims(token).exp - now()} s left on the token` : 'no user token';
  console.log(`${stamp()}  ${label.padEnd(34)} data API ${response.status}  rows ${rows}  (${left})`);
  return { status: response.status, rows };
}

/** The auth server, for contrast: does it still accept the token? */
async function authAccepts(token) {
  const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, authorization: `Bearer ${token}` } });
  return response.status;
}

const a = device();
const b = device();
const sign = async (client) => {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`Could not sign in: ${error?.message ?? 'no session'}`);
  return data.session.access_token;
};
const tokenA = await sign(a);
const tokenB = await sign(b);
const { iat, exp } = claims(tokenA);
console.log(`access token lifetime ${exp - iat} s, expires at ${new Date(exp * 1000).toISOString().slice(11, 19)} UTC (${exp - now()} s from now)\n`);

console.log('--- before any sign-out');
const anonymous = await readRow('anonymous (no user token)', null, {});
const beforeA = await readRow('device A, its token', tokenA, { token: tokenA });
const beforeB = await readRow('device B, its token', tokenB, { token: tokenB });
const leave = async (code) => {
  await Promise.all([a.auth.signOut({ scope: 'local' }).catch(() => undefined), b.auth.signOut({ scope: 'local' }).catch(() => undefined)]);
  process.exit(code);
};
if (beforeA.status === 404 || beforeB.status === 404) {
  console.log('\nThe table security_session_probe is not there (or not exposed). Create it with the SQL in docs/security-audit/SCOPE_LOCAL_VERIFICATION.md first.');
  await leave(2);
}
if (beforeA.status !== 200 || beforeA.rows < 1 || beforeB.status !== 200 || beforeB.rows < 1) {
  console.log('\nBoth devices should read the test row before anything is signed out; they cannot, so the rest would mean nothing.');
  await leave(2);
}

console.log('\n--- device A signs out with scope local');
const { error } = await a.auth.signOut({ scope: 'local' });
console.log(`${stamp()}  signOut({ scope: 'local' }) on A: ${error ? 'error' : 'no error'}`);
const results = [];
const probe = async (when) => {
  console.log(`\n--- ${when}`);
  const oldA = await readRow('device A, its ORIGINAL token', tokenA, { token: tokenA });
  const sameB = await readRow('device B, its token', tokenB, { token: tokenB });
  console.log(`${stamp()}  auth server /auth/v1/user with A's token: ${await authAccepts(tokenA)}`);
  results.push({ when, oldA, sameB });
};
await probe('immediately after');
let waited = 0;
for (const target of DELAYS_SECONDS) {
  await sleep(target - waited);
  waited = target;
  await probe(`${target} s after`);
}

await b.auth.signOut({ scope: 'local' });
const usable = results.filter((entry) => entry.oldA.status === 200 && entry.oldA.rows >= 1).length;
console.log('\n--- summary');
console.log(`anonymous read: status ${anonymous.status}, rows ${anonymous.rows} (should be refused or empty)`);
console.log(`device A's original token read the row in ${usable} of ${results.length} reads after A signed out`);
console.log(usable === results.length ? 'The revoked access token stays usable on the data API.' : usable === 0 ? 'The revoked access token was refused on the data API.' : 'Mixed: see the lines above.');
console.log(`Device B kept reading in ${results.filter((entry) => entry.sameB.status === 200).length} of ${results.length} reads.`);
