// What the vault costs on a representative amount of data, in a real browser, at normal speed and with the CPU slowed
// (a phone is often 4 to 6 times slower than a desktop). Against the dev server, like browser.mjs:
//   npx vite --port 5199 &   then   BASE=http://localhost:5199 CHROMIUM=... node scripts/security-check/perf.mjs
// Made-up records only. "Items" are to-dos and notes (about 600 bytes each), "reflections" are longer (about 1.5 KB).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const { chromium } = await import('playwright').catch(() => createRequire(import.meta.url)(`${execSync('npm root -g').toString().trim()}/playwright`));
const BASE = process.env.BASE || 'http://localhost:5199';
const SIZES = { items: 10000, reflections: 2000, other: 5000 };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });

for (const rate of [1, 4, 6]) {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  await page.goto(`${BASE}/welcome/`);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  const out = await page.evaluate(async (sizes) => {
    const keys = await import('/src/data/sync/keys.ts');
    const vault = await import('/src/data/security/vault.ts');
    const { SecureRecordStore, memoryBackend } = await import('/src/data/security/recordStore.ts');
    const time = async (fn) => { const t = performance.now(); const value = await fn(); return [performance.now() - t, value]; };
    const pct = (a, p) => [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))];
    const word = (n) => Array.from({ length: n }, (_, i) => 'lorem' + ((i * 7919) % 997)).join(' ');
    const make = { items: (i) => ({ id: 'i' + i, title: 'Item ' + i, notes: word(70), status: 'OPEN', createdAt: '2026-11-06T00:00:00Z' }), reflections: (i) => ({ id: 'r' + i, body: word(180), tags: ['a', 'b'], createdAt: '2026-11-06T00:00:00Z' }), other: (i) => ({ id: 'o' + i, name: 'Thing ' + i, detail: word(30) }) };
    const result = { rate: null, sizes };

    const [ptime, setup] = await time(() => keys.createKeys('a long passphrase for tests'));
    result.createKeys_ms = Math.round(ptime);
    const envelopes = { userId: 'u', passphrase: setup.passphraseWrap, recovery: setup.recoveryWrap, passkeys: [] };
    const [cvt, made] = await time(() => vault.createVault(setup.dataKey, envelopes));
    result.createVault_ms = +cvt.toFixed(2);
    const [opt] = await time(() => vault.openVault(made.header, setup.dataKey));
    result.openVault_with_account_key_ms = +opt.toFixed(2);
    const [passT, accountKey] = await time(() => keys.unlockWithPassphrase(made.header.account.passphrase, 'a long passphrase for tests'));
    result.unlock_with_password_total_ms = Math.round(passT + (await time(() => vault.openVault(made.header, accountKey)))[0]);
    const [recT, recKey] = await time(() => keys.unlockWithRecoveryKey(made.header.account.recovery, setup.recoveryKey));
    result.unlock_with_recovery_key_total_ms = Math.round(recT + (await time(() => vault.openVault(made.header, recKey)))[0]);

    const bytes = { plain: 0, sealed: 0 };
    result.stores = {};
    for (const [name, count] of Object.entries(sizes)) {
      const backend = memoryBackend();
      const store = new SecureRecordStore(name, backend, () => made.lvk, 'sealed');
      const records = Array.from({ length: count }, (_, i) => make[name](i));
      const each = [];
      const [writeAll] = await time(async () => { for (const r of records) { const t = performance.now(); await store.put(r.id, r); each.push(performance.now() - t); } });
      let sealedBytes = 0, plainBytes = 0;
      for (const r of records) { plainBytes += JSON.stringify(r).length; sealedBytes += JSON.stringify(await backend.get(r.id)).length; }
      const reads = [];
      const [readAll] = await time(async () => { for (const r of records) { const t = performance.now(); await store.get(r.id); reads.push(performance.now() - t); } });
      result.stores[name] = { records: count, plain_KB: Math.round(plainBytes / 1024), sealed_KB: Math.round(sealedBytes / 1024), seal_all_ms: Math.round(writeAll), seal_per_record_ms_p50_p95: [+pct(each, 0.5).toFixed(3), +pct(each, 0.95).toFixed(3)], open_all_ms: Math.round(readAll), open_per_record_ms_p50_p95: [+pct(reads, 0.5).toFixed(3), +pct(reads, 0.95).toFixed(3)] };
      bytes.plain += plainBytes; bytes.sealed += sealedBytes;
    }
    result.total_plain_KB = Math.round(bytes.plain / 1024);
    result.total_sealed_KB = Math.round(bytes.sealed / 1024);
    result.size_overhead = +(bytes.sealed / bytes.plain).toFixed(2);

    // What opening all of it costs at unlock, on the work that matters: every record opened once (the hydrate a locked app does).
    const everything = [];
    for (const [name, count] of Object.entries(sizes)) { const s = new SecureRecordStore(name, memoryBackend(), () => made.lvk, 'sealed'); for (let i = 0; i < count; i++) { await s.put('k' + i, make[name](i)); } everything.push(s); }
    const [hydrate] = await time(async () => { for (const s of everything) await s.all(); });
    result.open_everything_after_unlock_ms = Math.round(hydrate);
    // The same, opened in parallel batches instead of one at a time (what a Stage 3 hydrate would do).
    const [parallel] = await time(async () => {
      for (const s of everything) {
        const ids = await s.backend.ids();
        for (let i = 0; i < ids.length; i += 256) await Promise.all(ids.slice(i, i + 256).map((id) => s.get(id)));
      }
    });
    result.open_everything_in_parallel_batches_ms = Math.round(parallel);
    return result;
  }, SIZES);
  console.log(`\n=== CPU slowed ${rate}x${rate === 1 ? ' (none)' : ''} ===`);
  const { stores, ...rest } = out;
  console.log(JSON.stringify({ ...rest, rate }, null, 1).replace(/\n\s*/g, ' ').replace(/^{ /, '{\n  '));
  for (const [name, row] of Object.entries(stores)) console.log(`  ${name.padEnd(12)} ${row.records} records, ${row.plain_KB} KB -> ${row.sealed_KB} KB sealed | seal all ${row.seal_all_ms} ms (per record p50 ${row.seal_per_record_ms_p50_p95[0]}, p95 ${row.seal_per_record_ms_p50_p95[1]} ms) | open all ${row.open_all_ms} ms (p50 ${row.open_per_record_ms_p50_p95[0]}, p95 ${row.open_per_record_ms_p50_p95[1]} ms)`);
  await context.close();
}
await browser.close();
