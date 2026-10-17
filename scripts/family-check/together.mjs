import { chromium } from 'playwright';
const OUT = process.env.OUT || '.';
const B = 'http://localhost:4173';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
const p = await ctx.newPage();
const errors = []; p.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
await p.clock.install({ time: new Date('2026-10-12T10:00:00') });
const results = [];
const ok = (name, pass, detail = '') => results.push(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
const btn = (name) => p.getByRole('button', { name, exact: true }).first();
const go = async (path, wait = 1300) => { await p.goto(B + path); await p.waitForTimeout(wait); };
const begin = async () => { for (const n of ['Begin', 'Get started']) { const x = p.getByRole('button', { name: n, exact: true }); if (await x.count()) { await x.first().click(); await p.waitForTimeout(900); return; } } };
const text = () => p.evaluate(() => document.body.innerText);
const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, 'step broke: ' + String(e).split('\n')[0].slice(0, 140)); await p.screenshot({ path: `${OUT}/broke-${name.replace(/\W+/g, '-')}.png` }); } };

await go('/welcome/', 300);
await p.evaluate(() => {
  localStorage.setItem('proairetos.onboarded', 'yes');
  localStorage.setItem('proairetos.apps', JSON.stringify({ added: ['askesis', 'soma', 'oikonomia', 'hydros', 'praxis', 'theoria', 'diaita', 'philia', 'ergon', 'therapeia', 'dynamis', 'ktema', 'phyton'] }));
  localStorage.setItem('proairetos.todayOptIn', JSON.stringify(['bills', 'highlight']));
});

await step('Proairetos schedule', async () => {
  await go('/?open=settings');
  await p.getByRole('button', { name: /Your schedule/ }).first().click(); await p.waitForTimeout(700);
  const add = p.getByRole('button', { name: /Add a schedule/ }); if (await add.count()) { await add.first().click(); await p.waitForTimeout(500); }
  await p.getByRole('button', { name: /4 on, 4 off/ }).first().click(); await p.waitForTimeout(500);
  await p.getByRole('button', { name: /^Save/ }).first().click(); await p.waitForTimeout(800);
  ok('Proairetos: schedule saved', true);
});
await step('Name', async () => {
  await go('/?open=settings:profile');
  const field = p.getByLabel('Name', { exact: true }); await field.fill('Ada'); await field.press('Enter'); await p.waitForTimeout(400);
});

// Diaita reads the schedule
await step('Diaita', async () => {
  await go('/diaita/'); await begin();
  const t = await text();
  // Only Proairetos greets; the add-on apps name their page.
  ok('Diaita: no greeting of its own', !/Good (morning|afternoon|evening), Ada/.test(t));
  ok('Diaita: plans around the work block', !/Day off/.test(t) && /(work|19:00|7:00 PM|home)/i.test(t), t.match(/Good[^\n]*\n[^\n]*\n[^\n]*/)?.[0]?.replace(/\n/g, ' | '));
  await p.screenshot({ path: `${OUT}/diaita.png`, fullPage: true });
});

// Hydros keeps water to itself: nothing about it on Proairetos Today; its bar leads back to Proairetos
await step('Hydros', async () => {
  await go('/hydros/'); await begin();
  const glass = p.getByRole('button', { name: /^Glass/ }).first(); await glass.click(); await p.waitForTimeout(600);
  // On a phone the way back sits in the top bar (a copy that presses the dock's link).
  ok('Hydros bar: way back to Proairetos', (await p.locator('.ll-topbar__action[aria-label="Proairetos"]').count()) > 0);
  await go('/');
  ok('Proairetos Today: no water', !/Log a glass|since work began/i.test(await text()));
  ok('Proairetos bar: Apps', (await p.getByRole('button', { name: 'Apps', exact: true }).count()) > 0);
});

// Therapeia: a dose later today on Proairetos Today
await step('Therapeia', async () => {
  await go('/therapeia/'); await begin();
  await p.getByLabel('Name', { exact: true }).fill('Sertraline');
  await p.getByLabel('Time', { exact: true }).first().fill('11:00');
  await btn('Save').click(); await p.waitForTimeout(600);
  await go('/');
  ok('Proairetos Today: dose from Therapeia', /Sertraline/.test(await text()));
});

// Ergon: a chore whose day came, on Today and in search
await step('Ergon', async () => {
  await go('/ergon/'); await begin();
  await p.getByRole('button', { name: 'Take out the trash' }).click(); await p.waitForTimeout(600);
  await go('/');
  ok('Proairetos Today: chore from Ergon', /Take out the trash/.test(await text()));
});

// Ktema: upkeep due, on Today
await step('Ktema', async () => {
  await go('/ktema/'); await begin();
  const cancel = btn('Cancel'); if (await cancel.count()) { await cancel.click(); await p.waitForTimeout(600); }
  await p.getByRole('button', { name: '+ Test the smoke alarms' }).click(); await p.waitForTimeout(600);
  await go('/');
  ok('Proairetos Today: upkeep from Ktema', /smoke alarms/i.test(await text()));
});

// Philia: birthday in three days, on Today and Days ahead
await step('Philia', async () => {
  await go('/philia/'); await begin();
  await btn('Add someone').click(); await p.waitForTimeout(500);
  await p.getByLabel('Name', { exact: true }).fill('Maya');
  await p.getByLabel('Month').first().selectOption('10');
  await p.getByLabel('Day').first().selectOption('15');
  await btn('Save').click(); await p.waitForTimeout(600);
  await go('/');
  ok('Proairetos Today: birthday from Philia', /Maya/.test(await text()));
});

// Askesis: a run logged today, in Done today and Reflect; after-run line kept in Reflect
await step('Askesis', async () => {
  await go('/askesis/'); await begin();
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('askesis:settings') || '{}'); s.started = true; localStorage.setItem('askesis:settings', JSON.stringify(s)); });
  await go('/askesis/?open=log');
  await p.getByRole('button', { name: 'Log a workout' }).first().click(); await p.waitForTimeout(500);
  await p.locator('#distance').fill('4'); await p.getByLabel('Minutes').fill('30');
  await btn('Save workout').click(); await p.waitForTimeout(900);
  const t = await text();
  ok('Askesis after-run: Hydros link shown when Hydros is added', /Log a drink in Hydros/.test(t));
  const line = p.getByPlaceholder('A line to keep'); if (await line.count()) { await line.fill('Easy morning loop'); await btn('Keep it in Reflect').click(); await p.waitForTimeout(600); }
  await go('/');
  ok('Proairetos Today: run in Done today (Askesis)', /Run|4(\.0)? mi|30 min/.test(await text()));
  await go('/?open=reflect');
  ok('Proairetos Reflect: after-run line', /Easy morning loop/.test(await text()));
});

// Soma: recipe planned today shows in Days ahead; search finds it
await step('Soma', async () => {
  await go('/soma/'); await begin();
  await go('/soma/?open=recipes'); 
  await p.getByRole('button', { name: 'Add', exact: true }).first().click(); await p.waitForTimeout(500);
  await p.getByPlaceholder('Garlic herb chicken bowl').fill('Lentil soup');
  await p.getByRole('button', { name: 'Keep this recipe' }).click(); await p.waitForTimeout(800);
  await p.getByRole('button', { name: 'Plan it' }).first().click(); await p.waitForTimeout(400);
  await p.getByRole('group', { name: 'Days' }).getByRole('button').first().click(); await p.waitForTimeout(300);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await go('/');
  await p.locator('.tab-bar').getByRole('button', { name: 'Days ahead', exact: true }).click(); await p.waitForTimeout(900);
  ok('Proairetos Days ahead: planned meal (Soma)', /Lentil soup/.test(await text()));
});

// Oikonomia: bill due tomorrow, in Days ahead and Today (opt-in)
await step('Oikonomia', async () => {
  await go('/oikonomia/'); await begin();
  await go('/oikonomia/?open=capture');
  await p.getByLabel('Bill name').fill('Phone'); await p.getByLabel('Amount').fill('40');
  await p.getByLabel('Next due').fill('2026-10-13');
  await btn('Add bill').click(); await p.waitForTimeout(800);
  await go('/');
  ok('Proairetos Today: bill coming up (Oikonomia, opted in)', /Phone/.test(await text()));
  await p.locator('.tab-bar').getByRole('button', { name: 'Days ahead', exact: true }).click(); await p.waitForTimeout(900);
  ok('Proairetos Days ahead: bill date (Oikonomia)', /Phone/.test(await text()));
});

// Ktema cost goes into Oikonomia's Spent
await step('Ktema → Oikonomia', async () => {
  await go('/ktema/');
  await p.locator('.chore__open', { hasText: /smoke alarms/i }).first().click(); await p.waitForTimeout(600);
  await p.getByLabel('Cost (optional)').fill('12');
  ok('Ktema: "Also in Oikonomia’s Spent" offered', await p.getByRole('switch', { name: /Oikonomia/ }).count() > 0);
  await btn('Done').click(); await p.waitForTimeout(600);
  const spent = await p.evaluate(() => localStorage.getItem('oikonomia:spent:2026-10'));
  ok('Oikonomia Spent: upkeep cost arrived', /Test the smoke alarms/i.test(spent || ''));
});

// Praxis: a study block timed; shows in Done today
await step('Praxis', async () => {
  await go('/praxis/');
  await p.getByLabel('A block to study').fill('Statistics'); await p.getByLabel('A block to study').press('Enter'); await p.waitForTimeout(600);
  await p.getByRole('button', { name: /^Start/ }).first().click(); await p.waitForTimeout(400);
  await p.clock.runFor(26 * 60 * 1000); await p.waitForTimeout(800);
  const stop = p.getByRole('button', { name: /Stop here/ }); if (await stop.count()) { await stop.first().click(); await p.waitForTimeout(600); }
  await go('/');
  ok('Proairetos Today: study in Done today (Praxis)', /Statistics/.test(await text()));
});

// Dynamis: plan made, run days from Askesis are not needed; training day shows on Today
await step('Dynamis', async () => {
  await go('/dynamis/'); await begin();
  const make = p.getByRole('button', { name: 'Make the plan' }); if (await make.count()) { await make.click(); await p.waitForTimeout(700); }
  await go('/');
  ok('Proairetos Today: training from Dynamis', /Session A|training|Strength/i.test(await text()));
});

// Search across apps from Proairetos
await step('Search', async () => {
  await go('/');
  for (const [word, what] of [['trash', 'Ergon chore'], ['Maya', 'Philia person'], ['Sertraline', 'Therapeia medicine'], ['Lentil', 'Soma recipe'], ['Phone', 'Oikonomia bill'], ['smoke', 'Ktema upkeep']]) {
    await p.keyboard.press('/'); await p.waitForTimeout(500);
    await p.locator('dialog[open] input').first().fill(word); await p.waitForTimeout(700);
    const found = await p.locator('dialog[open]').innerText().catch(() => '');
    if (!found) await p.screenshot({ path: `${OUT}/search-${word}.png` });
    ok(`Proairetos search finds ${what}`, (found.match(new RegExp(word, 'gi')) || []).length >= 1 && found.length > word.length + 20, found.replace(/\n/g, ' | ').slice(0, 120));
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  }
});

// Notices: what Proairetos keeps for the next days
await step('Notices', async () => {
  await go('/?open=settings:notifications');
  for (const label of ['Chores', 'Medicines and visits', 'Upkeep and warranties', 'Birthdays and keeping in touch', 'Bills']) {
    const sw = p.getByRole('switch', { name: label, exact: true });
    if (await sw.count() && (await sw.getAttribute('aria-checked')) !== 'true') { await sw.click(); await p.waitForTimeout(200); }
  }
  await p.waitForTimeout(1500);
  const kept = await p.evaluate(async () => {
    const out = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const req of await cache.keys()) { const res = await cache.match(req); out.push(await res.text()); }
    }
    return out.join('\n');
  }).catch(() => '');
  for (const [word, what] of [['Sertraline|dose|medicine', 'Therapeia (dose at 11:00)'], ['Maya', 'Philia (birthday)'], ['Phone', 'Oikonomia (bill due tomorrow)']]) ok(`Notice kept for ${what}`, new RegExp(word, 'i').test(kept));
});

// Live update between two open apps (same browser): mark the chore done in Ergon while Proairetos is open
await step('Live update', async () => {
  await go('/');
  const other = await ctx.newPage();
  await other.goto(B + '/ergon/'); await other.waitForTimeout(1300);
  await other.getByRole('button', { name: 'Take out the trash: done' }).first().click(); await other.waitForTimeout(800);
  await p.waitForTimeout(1500);
  ok('Proairetos updates live when Ergon marks a chore done', !/Take out the trash/.test(await text()));
  await other.close();
  await go('/?open=settings:notifications'); await p.waitForTimeout(1500);
  const kept = await p.evaluate(async () => { const c = await caches.open('proairetos-notify'); const r = await c.match('/__notify/upcoming.json'); return r ? await r.text() : ''; });
  ok('Notice kept for Ergon (next week, after done)', /Take out the trash/.test(kept));
});

// Removing an app takes it out of Proairetos, keeps its records
await step('Removing an app', async () => {
  await p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('proairetos.apps'));
    s.added = s.added.filter((a) => a !== 'therapeia'); localStorage.setItem('proairetos.apps', JSON.stringify(s));
  });
  await go('/');
  ok('Removed app leaves Proairetos Today', !/Sertraline/.test(await text()));
  await go('/therapeia/');
  ok('Removed app shows its Add page', await p.locator('.added-only').count() > 0);
  ok('Removed app keeps its records', await p.evaluate(() => Object.keys(localStorage).some((k) => k.startsWith('therapeia:medicine:'))));
});

// Appearance follows Proairetos
await step('Appearance', async () => {
  await p.evaluate(() => localStorage.setItem('proairetos.appearance', JSON.stringify({ theme: 'light', textSize: 'default' })));
  const themes = [];
  for (const app of ['askesis', 'soma', 'ergon', 'ktema']) { await go(`/${app}/`, 900); themes.push(await p.evaluate(() => document.documentElement.dataset.theme || '')); }
  ok('Light appearance from Proairetos reaches the apps', themes.every((t) => t === 'light'), themes.join(','));
});

console.log(results.join('\n'));
console.log('page errors:', JSON.stringify(errors));
await b.close();
