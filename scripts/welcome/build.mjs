// Writes the public front pages from one list: /welcome/ (every app, install steps, privacy, the waitlist), one page
// per app at /welcome/<app>/, the waitlist's /welcome/thanks/ and /welcome/try-again/, and public/sitemap.xml.
// Static HTML with no script (the site's CSP allows none inline); the waitlist is a plain form posting to
// /api/waitlist (worker/waitlist.ts). Run: node scripts/welcome/build.mjs
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const site = 'https://proairetos.com';

const apps = [
  {
    id: 'proairetos', name: 'Proairetos', href: '/', icon: '/icons/icon-192.png', category: 'LifestyleApplication',
    ground: '#0e1112', accent: '#c9a274', ink: '#ece8e1',
    line: 'Your days, your values, your reflections',
    card: 'To-dos, your calendar and a journal. Works with any schedule, including night shifts.',
    about: 'A calm place for your days: write things down, see your day and the days ahead, and look back in your own words. It works on any schedule, including rotating and night shifts.',
    points: [
      ['Today', 'What is set for the day, what you chose to do, and the time that is open, on one page.'],
      ['Any schedule', 'Days, evenings, nights or none. Your day turns over when you choose, and a night shift keeps its day.'],
      ['Reflect', 'A journal, three good things, decisions and a weekly look back, in your own words.'],
      ['Compass', 'Up to five values you choose, goals you are working toward, and the people who matter.'],
    ],
  },
  {
    id: 'askesis', name: 'Askesis', icon: '/askesis/icons/icon-192.png', category: 'HealthApplication',
    ground: '#0b0f0e', accent: '#86d9b0', ink: '#e8ece9',
    line: 'Running, from your first walk-run',
    card: 'A running plan from your first walk-run to the goal you set.',
    about: 'A running plan that starts where you are, from your first walk-run, and builds toward the aim you set: a time, a distance or simply running steadily.',
    points: [
      ['Your own plan', 'A short test places your first week. Weekly time grows gently, with an easier week every fourth.'],
      ['Guided sessions', 'Bells to walk and run that keep time with the screen locked, and your own music.'],
      ['A plain log', 'Runs, distance and how they felt, with your longest and fastest as plain records.'],
      ['Lighter today', 'Swap a session for an easier one for the day. Moving on a week is always your choice.'],
    ],
  },
  {
    id: 'soma', name: 'Soma', icon: '/soma/icons/icon-192.png', category: 'LifestyleApplication',
    ground: '#f3ede2', accent: '#2f5a3e', ink: '#2f5a3e',
    line: 'Recipes and groceries',
    card: 'Recipes, a grocery list sorted by aisle, and each recipe’s Nutri-Score.',
    about: 'Your recipes in one place, brought in from a link, pasted text or a photo of a recipe card, with a grocery list that sorts itself by aisle.',
    points: [
      ['Bring recipes in', 'From a website, pasted text or a photo of a card, read on your phone.'],
      ['Groceries by aisle', 'Add a recipe’s ingredients in one tap. Share the list with someone you shop with.'],
      ['A loose week', 'Place meals on days, repeat a week, and see what to use soon from the kitchen.'],
      ['Nutri-Score', 'Each recipe’s grade and nutrients per serving, worked out from its ingredients.'],
    ],
  },
  {
    id: 'oikonomia', name: 'Oikonomia', icon: '/oikonomia/icons/icon-192.png', category: 'FinanceApplication',
    ground: '#0d1110', accent: '#d79572', ink: '#f2eee6',
    line: 'Bills and household essentials',
    card: 'Bills and subscriptions, with reminders before they’re due.',
    about: 'Bills and subscriptions with their dates in view, a monthly plan by area, and what actually went out, read from your bank statements on your phone.',
    points: [
      ['Bills in view', 'Each bill’s next date, a reminder before it, and a pull to mark it paid, with undo.'],
      ['Payday', 'Your next pay date and the bills before it, with what is left after them.'],
      ['Spent', 'Bring in a bank or card statement. Only money out is kept, sorted into your areas.'],
      ['A monthly plan', 'Amounts by area, with what was spent beside them. Facts, never advice.'],
    ],
  },
  {
    id: 'theoria', name: 'Theoria', icon: '/theoria/icons/icon-192.png', category: 'BookApplication',
    ground: '#0b1020', accent: '#d9b46a', ink: '#ede5d3',
    line: 'Reading, highlights and notes',
    card: 'Read your books and PDFs and keep your highlights and notes.',
    about: 'Read your own books and PDFs on any device, and keep your highlights and notes with them.',
    points: [
      ['Your books', 'EPUB, PDF, text and Markdown, kept on your device, with shelves and search.'],
      ['Highlights and notes', 'Mark passages, write notes, and export them as Markdown.'],
      ['From a Kindle', 'Bring in your Kindle highlights or a Readwise export.'],
      ['A library folder', 'Keep books in OneDrive, Google Drive or Dropbox, and they come onto your shelf.'],
      ['Pomodoro', 'Timed reading blocks with a bell, cards to look at again, and your reading time by day.'],
    ],
  },
  {
    id: 'diaita', name: 'Diaita', icon: '/diaita/icons/icon-192.png', category: 'HealthApplication',
    ground: '#0e1014', accent: '#e2b26e', ink: '#ece8e1',
    line: 'Sleep, light, food and caffeine around your schedule',
    card: 'Sleep, naps, light, caffeine and meals planned around your schedule.',
    about: 'A plan for sleep, naps, light, caffeine and meals that follows your actual schedule, including night shifts, with the source for every line.',
    points: [
      ['Around your schedule', 'Bedtime, wind-down and last caffeine move with your days, evenings and nights.'],
      ['Night shifts', 'A nap before the first night, light in the first half, and a short sleep after the last.'],
      ['Wind down', 'A 10 to 20 minute wind-down with sounds, and a dim page for when you can’t sleep.'],
      ['Sources', 'Every suggestion opens the study it comes from.'],
    ],
  },
  {
    id: 'philia', name: 'Philia', icon: '/philia/icons/icon-192.png', category: 'LifestyleApplication',
    ground: '#120f10', accent: '#e39a8f', ink: '#f0e8e4',
    line: 'The people in your life',
    card: 'Birthdays, gift ideas and times together with the people in your life.',
    about: 'Birthdays, things to remember, gift ideas and times together with the people in your life.',
    points: [
      ['Coming up', 'Birthdays and other dates in the next month, with a reminder when you want one.'],
      ['Keep in touch', 'Choose a rhythm for someone, and see how long it has been. Nothing more.'],
      ['One tap', 'Called, messaged or saw them, kept as a timeline for each person.'],
      ['Gift ideas', 'Ideas as they come to you, marked when given.'],
    ],
  },
  {
    id: 'ergon', name: 'Ergon', icon: '/ergon/icons/icon-192.png', category: 'LifestyleApplication',
    ground: '#0e1112', accent: '#8fc1b5', ink: '#e9ece8',
    line: 'Household chores, shared',
    card: 'Household chores that come around, shared with the people you live with.',
    about: 'Chores that come around when they are due, shared with the people you live with, with turns if you take them.',
    points: [
      ['Comes around', 'Every few days, on weekdays, monthly or once, counted from when it was last done.'],
      ['Shared', 'One household for everyone you live with, sealed so only you can read it.'],
      ['Turns', 'A chore can pass to the next person each time it is done.'],
      ['Steps and rooms', 'Steps for bigger chores, and chores grouped by room.'],
    ],
  },
  {
    id: 'therapeia', name: 'Therapeia', icon: '/therapeia/icons/icon-192.png', category: 'HealthApplication',
    ground: '#10141a', accent: '#9cb8e0', ink: '#e8edf4',
    line: 'Medicines and appointments',
    card: 'Medicines at the times you set or around your sleep, refills, and visits with your questions.',
    about: 'Medicines at the times you set, or around your sleep on any schedule, with refills, appointments and the questions for them. It gives no medical advice.',
    points: [
      ['Dose times', 'At a clock time, after waking or before sleep, so doses follow a night shift.'],
      ['Refills', 'The supply counts down as you mark doses, with a reminder before it runs out.'],
      ['Visits', 'Questions to ask, notes, and a printable list of your medicines.'],
      ['A care circle', 'Share the list with someone who helps, sealed so only you two can read it.'],
    ],
  },
  {
    id: 'dynamis', name: 'Dynamis', icon: '/dynamis/icons/icon-192.png', category: 'HealthApplication',
    ground: '#141110', accent: '#e0a36b', ink: '#f2ebe4',
    line: 'Strength and mobility',
    card: 'Strength and mobility sessions built from the research, with every set logged.',
    about: 'Full-body strength sessions built from the research, with sets, weights and rests logged as you go, and short mobility routines.',
    points: [
      ['Built from research', 'Each muscle group twice a week, reps by your aim, stopping a few reps short.'],
      ['Gym or home', 'A gym, dumbbells at home, or no equipment at all. Swap any exercise.'],
      ['Every set', 'Rests on a timer, and each exercise’s history and records.'],
      ['Offered, never applied', 'When every set reaches the top, a little more weight is offered. You decide.'],
    ],
  },
  {
    id: 'ktema', name: 'Ktema', icon: '/ktema/icons/icon-192.png', category: 'LifestyleApplication',
    ground: '#12130f', accent: '#c7b37a', ink: '#efece2',
    line: 'Home, car and belongings',
    card: 'Warranties, models and manuals, and the upkeep your home and car need.',
    about: 'Warranties, models and manuals in one place, and the upkeep your home and car need, by date or by mileage.',
    points: [
      ['Your things', 'Make, model, serial, where it was bought, and the manual, with photos.'],
      ['Warranties', 'A reminder a month before a warranty or document ends.'],
      ['Upkeep', 'Filters, oil and the rest, by date or by distance for a car.'],
      ['For insurance', 'A list by room with prices, to print or download.'],
    ],
  },
  {
    id: 'phyton', name: 'Phyton', icon: '/phyton/icons/icon-192.png', category: 'LifestyleApplication',
    ground: '#0f1410', accent: '#9fc48a', ink: '#ecf0e6',
    line: 'Plants and watering',
    card: 'Your plants, each checked when its soil is likely dry. Identify a plant from a photo.',
    about: 'Each plant comes around to be checked when its soil is likely dry, from its type and your own waterings. Identify a plant from a photo.',
    points: [
      ['Checked, not scheduled', 'Watered or still moist: the timing learns from what you actually did.'],
      ['Identify', 'Name a plant from up to three photos, with care notes for about 85 types.'],
      ['Outside', 'Rain counts as watering, and frost tonight brings a reminder.'],
      ['Away', 'A sheet for whoever waters while you are gone.'],
    ],
  },
  {
    id: 'poreia', name: 'Poreia', icon: '/poreia/icons/icon-192.png', category: 'TravelApplication',
    ground: '#071c24', accent: '#4cc3c7', ink: '#e8f5f2',
    line: 'Trips and time off',
    card: 'Trips from the first idea to home again: days, bookings, what is around, packing, money and time off.',
    about: 'Plan a trip from the first idea to home again: one place or several, days with their weather, bookings brought in from any confirmation, a map of what is around, packing, spending shared with the people going, and time off against your work schedule.',
    points: [
      ['Days that fit', 'Each day with its forecast, the walk between two places, and the stretches with nothing set.'],
      ['Bookings from anywhere', 'Paste a confirmation, or bring in a PDF, a screenshot or a calendar invite; each lands on its day with its code.'],
      ['Together', 'Share a trip with the people going: the same days, bookings, packing and spending, and who paid what.'],
      ['Around you', 'A map of each place with the guide’s picks, what is nearby and events in your dates, with directions.'],
      ['Time off', 'Your balance and how it grows, with each trip’s hours counted from your work shifts.'],
      ['With Proairetos', 'Approved time off takes those shifts off your schedule; trips show on Today and in Days ahead.'],
    ],
  },
];

const addOns = apps.filter((app) => app.id !== 'proairetos');
const hrefOf = (app) => app.href ?? `/${app.id}/`;
const pageOf = (app) => (app.id === 'proairetos' ? '/welcome/' : `/welcome/${app.id}/`);
const shots = (app) => {
  const folder = app.id === 'proairetos' ? '' : `/${app.id}`;
  return ['narrow-1', 'narrow-2', 'wide-1']
    .filter((name) => existsSync(join(root, 'public', folder, 'screenshots', `${name}.webp`)))
    .map((name) => ({ src: `${folder}/screenshots/${name}.webp`, wide: name.startsWith('wide') }));
};
const esc = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const baseStyle = `
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--bg); color: var(--text); font: 17px/1.6 -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; }
      a { color: inherit; }
      .wrap { max-width: 64rem; margin: 0 auto; padding: 0 16px; }
      h1, h2, h3 { font-family: 'EB Garamond', Georgia, serif; font-weight: 500; line-height: 1.15; margin: 0; }
      h2 { font-size: 2rem; margin-bottom: 1.2rem; }
      .lead { color: var(--muted); font-size: 1.1rem; }
      .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 1.8rem; }
      .button {
        display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 0 22px;
        border-radius: 999px; text-decoration: none; font-weight: 600; border: 1px solid var(--border); font: inherit; font-weight: 600;
        background: transparent; color: inherit; cursor: pointer;
      }
      .button--main { background: var(--accent); color: var(--on-accent); border-color: transparent; }
      section.wrap { padding: 2.5rem 16px; border-top: 1px solid var(--border); }
      .notes { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); }
      .notes p { margin: 0.3rem 0 0; color: var(--muted); }
      .notes h3 { font-size: 1.3rem; }
      .waitlist { background: var(--card); border: 1px solid var(--border); border-radius: 24px; padding: 24px; }
      .waitlist h2 { margin-bottom: 0.4rem; }
      .waitlist > p { margin: 0 0 1.2rem; color: var(--muted); }
      .waitlist__row { display: flex; flex-wrap: wrap; gap: 12px; }
      .waitlist input[type='email'] {
        flex: 1 1 16rem; min-height: 48px; padding: 0 18px; border-radius: 999px; border: 1px solid var(--border);
        background: var(--bg); color: var(--text); font: inherit;
      }
      .waitlist fieldset { border: 0; padding: 0; margin: 1.2rem 0 0; }
      .waitlist legend { font-weight: 600; margin-bottom: 0.6rem; padding: 0; }
      .picks { display: flex; flex-wrap: wrap; gap: 8px; }
      .picks label {
        display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 14px; border-radius: 999px;
        border: 1px solid var(--border); cursor: pointer;
      }
      .picks input { accent-color: var(--accent); width: 18px; height: 18px; margin: 0; }
      .picks label:has(input:checked) { border-color: var(--accent); }
      .waitlist small { display: block; margin-top: 1rem; color: var(--muted); font-size: 0.9rem; }
      .hidden-field { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
      :focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
      footer { padding: 2rem 0 3rem; color: var(--muted); font-size: 0.95rem; border-top: 1px solid var(--border); }
      footer a { margin-right: 18px; display: inline-block; min-height: 44px; line-height: 44px; }`;

const head = ({ title, description, path, image = '/social/proairetos.png', icon = '/favicon.svg', jsonLd }) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:image" content="${site}${image}" />
    <meta property="og:url" content="${site}${path}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="canonical" href="${site}${path}" />
    <link rel="icon" href="${icon}" />${jsonLd ? `\n    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}`;

/** The waitlist form: an email, optionally the apps of interest. Works with no script. */
const waitlist = ({ source, picked = [], choose = true }) => `
      <section class="wrap" id="waitlist" aria-labelledby="waitlist-title">
        <form class="waitlist" method="post" action="/api/waitlist">
          <h2 id="waitlist-title">Hear when it opens</h2>
          <p>The family is in early use. Leave your email to hear when it opens, and be first to try what comes next.</p>
          <input type="hidden" name="source" value="${source}" />
          <div class="hidden-field" aria-hidden="true"><label>Website <input type="text" name="website" tabindex="-1" autocomplete="off" /></label></div>
          <div class="waitlist__row">
            <label class="hidden-field" for="waitlist-email">Email</label>
            <input id="waitlist-email" type="email" name="email" required autocomplete="email" placeholder="you@example.com" />
            <button class="button button--main" type="submit">Keep me posted</button>
          </div>${
            choose
              ? `
          <fieldset>
            <legend>Apps you’re curious about (optional)</legend>
            <div class="picks">
${apps.map((app) => `              <label><input type="checkbox" name="apps" value="${app.id}"${picked.includes(app.id) ? ' checked' : ''} /> ${app.name}</label>`).join('\n')}
            </div>
          </fieldset>`
              : picked.map((id) => `\n          <input type="hidden" name="apps" value="${id}" />`).join('')
          }
          <small>Only used to tell you about Proairetos and its apps. <a href="/privacy.html#waitlist">Privacy</a></small>
        </form>
      </section>`;

const footer = `
    <footer class="wrap">
      <a href="/welcome/">Home</a>
      <a href="/welcome/apps/">All the apps</a>
      <a href="/">Proairetos</a>
      <a href="/lamplight/">Lamplight</a>
      <a href="/privacy.html">Privacy</a>
    </footer>
  </body>
</html>
`;

const privacyNotes = `
      <section class="wrap" aria-labelledby="yours">
        <h2 id="yours">Privacy</h2>
        <div class="notes">
          <div>
            <h3>On your phone</h3>
            <p>Everything works without an account and without a connection. Nothing is sent anywhere unless you turn on sync.</p>
          </div>
          <div>
            <h3>Encrypted if you sync</h3>
            <p>With sync on, your data is encrypted on your phone with a key only you hold. The server can’t read it.</p>
          </div>
          <div>
            <h3>No scores</h3>
            <p>No streaks, badges or rankings.</p>
          </div>
        </div>
      </section>`;

// ---------- The front page ----------

// Prices come from the Worker's own list, so the page and the Store never disagree.
const storeSource = readFileSync(join(root, 'worker', 'store.ts'), 'utf8');
const cents = (plan) => Number(storeSource.match(new RegExp(`PLAN_PRICES = \\{[^}]*\\b${plan}: (\\d+)`))?.[1] ?? 0);
const dollars = (plan) => `$${(cents(plan) / 100).toFixed(2)}`;

// The four apps the front page shows; the rest are one click away on /welcome/apps/.
const FEATURED = ['askesis', 'soma', 'oikonomia', 'poreia'];

const pageColors = `
      :root {
        color-scheme: dark;
        --bg: #0a0c0e; --card: #13171a; --text: #f2ece2; --muted: #b3ada3; --accent: #c9a274; --on-accent: #1a140d;
        --border: rgba(255, 255, 255, 0.1); --glow: rgba(201, 162, 116, 0.18);
      }
      @media (prefers-color-scheme: light) {
        :root {
          color-scheme: light;
          --bg: #f6efe4; --card: #fffaf2; --text: #2b251f; --muted: #5f5448; --accent: #8a6a46; --on-accent: #fffaf2;
          --border: rgba(43, 37, 31, 0.14); --glow: rgba(138, 106, 70, 0.16);
        }
      }`;

const appCard = (app) => {
  const [shot] = shots(app);
  return `          <li class="app">
            <div class="app__head"><img src="${app.icon}" alt="" width="44" height="44" /><h3 class="app__name">${app.name}</h3></div>
            <p>${esc(app.card)}</p>${shot && !shot.wide ? `\n            <img class="app__shot" src="${shot.src}" alt="${app.name} on a phone" width="300" height="533" />` : ''}
            <div class="app__actions">
              <a class="button${app.id === 'proairetos' ? ' button--main' : ''}" href="${hrefOf(app)}">Open</a>${
                app.id === 'proairetos' ? '' : `\n              <a class="button" href="${pageOf(app)}">More</a>`
              }
            </div>
          </li>`;
};

const appGridStyle = `
      .apps { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); list-style: none; padding: 0; margin: 0; }
      .app { display: grid; grid-template-rows: auto auto 1fr auto; gap: 12px; padding: 18px; border-radius: 20px; background: var(--card); border: 1px solid var(--border); }
      .app__head { display: flex; align-items: center; gap: 12px; }
      .app__head img { width: 44px; height: 44px; border-radius: 12px; }
      .app__name { font-size: 1.35rem; }
      .app p { margin: 0; color: var(--muted); }
      .app__shot { width: 100%; height: auto; aspect-ratio: 9 / 16; object-fit: cover; object-position: top; border-radius: 14px; border: 1px solid var(--border); max-height: 22rem; }
      .app__actions { display: flex; gap: 8px; align-self: end; }
      .app__actions .button { flex: 1; }`;

const installSteps = `
      <section class="wrap" id="install" aria-labelledby="install-title">
        <h2 id="install-title">Add it to your Home Screen</h2>
        <details open>
          <summary>iPhone and iPad (Safari)</summary>
          <ol>
            <li>Open <a href="/">proairetos.com</a> in Safari.</li>
            <li>Tap the Share button, then <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>
            <li>Open it from the Home Screen. Reminders work from there.</li>
          </ol>
        </details>
        <details>
          <summary>Android (Chrome)</summary>
          <ol>
            <li>Open <a href="/">proairetos.com</a> in Chrome.</li>
            <li>Tap <strong>Install</strong> when it is offered, or the menu (⋮), then <strong>Install app</strong>.</li>
          </ol>
        </details>
        <details>
          <summary>A computer (Chrome, Edge or Safari)</summary>
          <ol>
            <li>Open <a href="/">proairetos.com</a>.</li>
            <li>In Chrome or Edge, choose the install icon in the address bar. In Safari on a Mac, choose File, then <strong>Add to Dock</strong>.</li>
          </ol>
        </details>
      </section>`;

function frontPage() {
  const description =
    'A calm place for your days. Write things down, see what is ahead, and look back in your own words, on any schedule. Free, private, with no scores or streaks.';
  const featured = FEATURED.map((id) => apps.find((app) => app.id === id)).filter(Boolean);
  const others = addOns.length - featured.length;
  return `${head({
    title: 'Proairetos: make time for what matters',
    description,
    path: '/welcome/',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Proairetos',
      url: `${site}/`,
      applicationCategory: 'LifestyleApplication',
      operatingSystem: 'Any (installs from the browser)',
      description,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  })}
    <style>${pageColors}${baseStyle}${appGridStyle}
      .hero { padding: 4.5rem 16px 3rem; display: grid; gap: 2.5rem; align-items: center; grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr); }
      .hero__words img { width: 56px; height: 56px; border-radius: 14px; }
      .hero h1 { font-size: clamp(2.6rem, 7vw, 4.2rem); margin-top: 1.2rem; text-wrap: balance; }
      .hero .lead { max-width: 32rem; margin: 1.2rem 0 0; font-size: 1.2rem; }
      .hero__phone { justify-self: center; width: min(100%, 320px); border-radius: 36px; border: 1px solid var(--border); box-shadow: 0 30px 80px var(--glow); }
      .hero__phone img { display: block; width: 100%; height: auto; border-radius: 36px; }
      .fine { color: var(--muted); font-size: 0.95rem; margin-top: 0.9rem; }
      .tour { display: grid; gap: 28px; }
      .tour__row { display: grid; gap: 24px; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: center; }
      .tour__row img { width: 100%; height: auto; border-radius: 18px; border: 1px solid var(--border); }
      .tour__row--phone img { max-width: 300px; justify-self: center; border-radius: 28px; }
      .tour h3 { font-size: 1.6rem; }
      .tour p { color: var(--muted); margin: 0.6rem 0 0; max-width: 30rem; }
      .ways { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); }
      .ways div { padding: 18px; border-radius: 18px; background: var(--card); border: 1px solid var(--border); }
      .ways h3 { font-size: 1.3rem; }
      .ways p { margin: 0.4rem 0 0; color: var(--muted); }
      .more { margin-top: 1.2rem; }
      .apps--featured { grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr)); }
      .prices { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); }
      .price { padding: 18px; border-radius: 18px; background: var(--card); border: 1px solid var(--border); display: grid; gap: 4px; }
      .price b { font-size: 1.1rem; }
      .price strong { font-size: 1.5rem; font-family: 'EB Garamond', Georgia, serif; font-weight: 500; }
      .price span { color: var(--muted); font-size: 0.95rem; }
      .price--free { border-color: var(--accent); }
      details { background: var(--card); border: 1px solid var(--border); border-radius: 16px; margin-bottom: 12px; }
      summary { cursor: pointer; padding: 16px 18px; font-weight: 600; min-height: 48px; }
      details ol { margin: 0; padding: 0 18px 16px 40px; color: var(--muted); }
      details li { margin: 6px 0; }
      @media (max-width: 760px) {
        .hero { grid-template-columns: 1fr; padding-top: 3rem; }
        .tour__row { grid-template-columns: 1fr; }
        .tour__row--flip > :first-child { order: 2; }
      }
    </style>
  </head>
  <body>
    <header class="wrap hero">
      <div class="hero__words">
        <img src="/icons/icon-192.png" alt="" />
        <h1>Make time for what matters</h1>
        <p class="lead">A calmer way to organize your days. Write things down, see what’s ahead, and look back in your own words, on any schedule, with nothing to keep up with.</p>
        <div class="actions">
          <a class="button button--main" href="/">Open Proairetos</a>
          <a class="button" href="#how">See how it works</a>
        </div>
        <p class="fine">Free. Works on any phone or computer, from the browser.</p>
      </div>
      <div class="hero__phone"><img src="/screenshots/narrow-1.webp" alt="Proairetos Today: an intention for the day, the day’s plans and the open time between them" width="390" height="844" /></div>
    </header>

    <main>
      <section class="wrap" id="how" aria-labelledby="how-title">
        <h2 id="how-title">How it works</h2>
        <div class="tour">
          <div class="tour__row">
            <div>
              <h3>Get it out of your head</h3>
              <p>Type it the way you’d say it: “dentist Friday 3pm”. It lands on the right day with a reminder. Ideas, worries and to-dos can wait unsorted until you have a minute.</p>
            </div>
            <img src="/screenshots/wide-1.webp" alt="Proairetos on a computer: today’s intention, the day’s plans and the open time" width="1280" height="800" />
          </div>
          <div class="tour__row tour__row--flip tour__row--phone">
            <img src="/screenshots/narrow-2.webp" alt="Days ahead: the week as a list, with timed plans and to-dos under each day" width="390" height="844" />
            <div>
              <h3>See your days, on your schedule</h3>
              <p>Today shows what is set, what you chose to do and the time that is open. Days ahead shows the week. Work days, evenings, nights, school runs or none: your day turns over when you choose.</p>
            </div>
          </div>
          <div class="tour__row">
            <div>
              <h3>Look back in your own words</h3>
              <p>A short journal, three good things at the end of a day, decisions and what came of them. Nothing is scored, ranked or turned into a streak.</p>
            </div>
            <div class="ways">
              <div><h3>Nothing piles up</h3><p>No red dates and no catching up. What you didn’t get to waits for you, or goes.</p></div>
              <div><h3>Yours alone</h3><p>Kept on your device. Sync is optional and sealed with a key only you hold.</p></div>
            </div>
          </div>
        </div>
      </section>

      <section class="wrap" aria-labelledby="family-title">
        <h2 id="family-title">Add what your life needs</h2>
        <p class="lead" style="margin-top:-0.4rem;margin-bottom:1.4rem">One account. The apps you add show up on Proairetos’s Today, so a run, tonight’s dinner or a bill due Friday sits beside your plans.</p>
        <ul class="apps apps--featured">
${featured.map(appCard).join('\n')}
        </ul>
        <p class="more"><a class="button" href="/welcome/apps/">See all ${addOns.length} apps</a></p>
      </section>

      <section class="wrap" aria-labelledby="prices-title">
        <h2 id="prices-title">Prices</h2>
        <div class="prices">
          <div class="price price--free"><b>Proairetos</b><strong>Free</strong><span>Today, Days ahead, Capture, Reflect and Compass. No time limit.</span></div>
          <div class="price"><b>Core apps</b><strong>${dollars('core')}/mo</strong><span>Every app in the family except Soma and Phyton.</span></div>
          <div class="price"><b>Soma</b><strong>${dollars('soma')}/mo</strong><span>Recipes, groceries and Nutri-Score.</span></div>
          <div class="price"><b>Phyton</b><strong>${dollars('phyton')}/mo</strong><span>Plants, with identification from a photo. Both for ${dollars('bundle')}/mo.</span></div>
          <div class="price"><b>Proairetos cloud</b><strong>${dollars('cloud')}/mo</strong><span>Encrypted sync and backup. Or sync free through your own Google Drive, Dropbox or OneDrive.</span></div>
        </div>
      </section>
${privacyNotes}
${installSteps}
${waitlist({ source: 'welcome' })}
    </main>
${footer}`;
}

// ---------- Every app ----------

function allAppsPage() {
  const description = `Proairetos and its ${addOns.length} apps: running, recipes, bills, trips, reading, sleep, people, chores, medicines, strength, the things you own and your plants. One account, private, with no scores or streaks.`;
  return `${head({ title: 'The Proairetos apps', description, path: '/welcome/apps/' })}
    <style>${pageColors}${baseStyle}${appGridStyle}
      header { padding: 4rem 16px 2rem; }
      h1 { font-size: clamp(2.3rem, 6vw, 3.2rem); }
      header .lead { max-width: 36rem; margin: 1rem 0 0; }
    </style>
  </head>
  <body>
    <header class="wrap">
      <h1>The apps</h1>
      <p class="lead">Proairetos is free. Each app here works on its own and shows up on Proairetos’s Today once you add it.</p>
    </header>
    <main>
      <section class="wrap" aria-label="Every app">
        <ul class="apps">
${apps.map(appCard).join('\n')}
        </ul>
      </section>
${installSteps}
    </main>
${footer}`;
}

// ---------- One page per app ----------

/** Relative luminance, to choose the page's color scheme from the app's own ground. */
const light = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.5;
};

function appPage(app) {
  const title = `${app.name}: ${app.line.charAt(0).toLowerCase()}${app.line.slice(1)}`;
  const pictures = shots(app);
  const [first] = pictures.filter((shot) => !shot.wide);
  const others = pictures.filter((shot) => shot !== first);
  const isLight = light(app.ground);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: app.name,
    url: `${site}${hrefOf(app)}`,
    description: app.about,
    applicationCategory: app.category,
    operatingSystem: 'Any (installable web app)',
    image: `${site}${app.icon}`,
    isPartOf: { '@type': 'WebApplication', name: 'Proairetos', url: `${site}/` },
  };
  const others13 = addOns.filter((each) => each.id !== app.id);
  return `${head({ title, description: app.about, path: pageOf(app), icon: app.icon, jsonLd })}
    <style>
      :root {
        color-scheme: ${isLight ? 'light' : 'dark'};
        --bg: ${app.ground}; --text: ${app.ink}; --accent: ${app.accent}; --on-accent: ${app.ground};
        --muted: color-mix(in srgb, ${app.ink} ${isLight ? 80 : 74}%, ${app.ground});
        --card: color-mix(in srgb, ${app.ink} ${isLight ? 5 : 6}%, ${app.ground});
        --border: color-mix(in srgb, ${app.ink} 16%, ${app.ground});
      }${baseStyle}
      .hero { display: grid; gap: 32px; align-items: center; padding: 3.5rem 16px 3rem; }
      .hero__mark { display: inline-flex; align-items: center; gap: 14px; text-decoration: none; }
      .hero__mark img { width: 64px; height: 64px; border-radius: 16px; }
      .hero__mark span { font-family: 'EB Garamond', Georgia, serif; font-size: 1.6rem; }
      h1 { font-size: clamp(2.2rem, 6vw, 3.2rem); margin-top: 1.4rem; }
      .hero .lead { margin: 1rem 0 0; max-width: 34rem; }
      .phone { width: min(100%, 300px); height: auto; justify-self: center; border-radius: 28px; border: 1px solid var(--border); box-shadow: 0 30px 60px -30px rgba(0, 0, 0, 0.55); }
      .points { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); list-style: none; padding: 0; margin: 0; }
      .points li { background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 18px; }
      .points h3 { font-family: inherit; font-weight: 600; font-size: 1.1rem; }
      .points p { margin: 0.4rem 0 0; color: var(--muted); }
      .shots { display: flex; gap: 16px; overflow-x: auto; padding-bottom: 8px; scroll-snap-type: x mandatory; }
      .shots img { height: 26rem; width: auto; max-width: none; border-radius: 20px; border: 1px solid var(--border); scroll-snap-align: start; }
      .family { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; padding: 0; margin: 0; }
      .family a { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 14px 0 8px; border-radius: 999px; border: 1px solid var(--border); text-decoration: none; }
      .family img { width: 28px; height: 28px; border-radius: 8px; }
      @media (min-width: 48rem) {
        .hero { grid-template-columns: 1.2fr 1fr; padding: 5rem 16px 4rem; }
        .shots img { height: 30rem; }
      }
    </style>
  </head>
  <body>
    <main>
      <header class="wrap hero">
        <div>
          <a class="hero__mark" href="/welcome/" aria-label="All the apps"><img src="${app.icon}" alt="" width="64" height="64" /><span>${app.name}</span></a>
          <h1>${esc(app.line)}</h1>
          <p class="lead">${esc(app.about)}</p>
          <div class="actions">
            <a class="button button--main" href="${hrefOf(app)}">Open ${app.name}</a>
            <a class="button" href="#waitlist">Hear when it opens</a>
          </div>
        </div>${first ? `\n        <img class="phone" src="${first.src}" alt="${app.name} on a phone" width="300" height="650" />` : ''}
      </header>

      <section class="wrap" aria-labelledby="what">
        <h2 id="what">What it does</h2>
        <ul class="points">
${app.points.map(([name, text]) => `          <li><h3>${esc(name)}</h3><p>${esc(text)}</p></li>`).join('\n')}
        </ul>
      </section>${
        others.length
          ? `

      <section class="wrap" aria-labelledby="look">
        <h2 id="look">A closer look</h2>
        <div class="shots">
${others.map((shot) => `          <img src="${shot.src}" alt="${app.name}${shot.wide ? ' on a computer' : ' on a phone'}" />`).join('\n')}
        </div>
      </section>`
          : ''
      }

      <section class="wrap" aria-labelledby="install-title">
        <h2 id="install-title">On any device</h2>
        <p class="lead">${app.name} is a web app: open it in your browser and add it to your Home Screen, on iPhone, Android or a computer. No app store, no download. <a href="/welcome/#install">How to add it</a></p>
      </section>
${waitlist({ source: app.id, picked: [app.id], choose: false })}
${privacyNotes}

      <section class="wrap" aria-labelledby="family">
        <h2 id="family">${app.id === 'proairetos' ? 'Apps that work with it' : 'Part of the Proairetos family'}</h2>
        <ul class="family">
${[apps[0], ...others13].filter((each) => each.id !== app.id).map((each) => `          <li><a href="${pageOf(each)}"><img src="${each.icon}" alt="" width="28" height="28" />${each.name}</a></li>`).join('\n')}
        </ul>
      </section>
    </main>
${footer}`;
}

// ---------- After the form ----------

const plainPage = ({ path, title, heading, text }) => `${head({ title, description: text, path })}
    <meta name="robots" content="noindex" />
    <style>
      :root { color-scheme: dark; --bg: #0a0c0e; --card: #13171a; --text: #f2ece2; --muted: #b3ada3; --accent: #c9a274; --on-accent: #1a140d; --border: rgba(255, 255, 255, 0.1); }
      @media (prefers-color-scheme: light) {
        :root { color-scheme: light; --bg: #f6efe4; --card: #fffaf2; --text: #2b251f; --muted: #5f5448; --accent: #8a6a46; --on-accent: #fffaf2; --border: rgba(43, 37, 31, 0.14); }
      }${baseStyle}
      main { min-height: 70vh; display: grid; place-content: center; text-align: center; padding: 4rem 16px; }
      main img { width: 64px; height: 64px; border-radius: 16px; justify-self: center; }
      h1 { font-size: clamp(2rem, 6vw, 2.8rem); margin-top: 1rem; }
      main .lead { max-width: 30rem; margin: 1rem auto 0; }
      main .actions { justify-content: center; }
    </style>
  </head>
  <body>
    <main>
      <img src="/icons/icon-192.png" alt="" />
      <h1>${heading}</h1>
      <p class="lead">${text}</p>
      <div class="actions">
        <a class="button button--main" href="/welcome/apps/">See the apps</a>
        <a class="button" href="/">Open Proairetos</a>
      </div>
    </main>
${footer}`;

// ---------- Write ----------

const write = (path, text) => {
  const file = join(root, 'public', path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
};

write('welcome/index.html', frontPage());
write('welcome/apps/index.html', allAppsPage());
for (const app of addOns) write(`welcome/${app.id}/index.html`, appPage(app));
write(
  'welcome/thanks/index.html',
  plainPage({ path: '/welcome/thanks/', title: 'You’re on the list', heading: 'You’re on the list', text: 'You’ll hear when Proairetos opens. Proairetos itself is free to use now.' }),
);
write(
  'welcome/try-again/index.html',
  plainPage({ path: '/welcome/try-again/', title: 'That didn’t go through', heading: 'That didn’t go through', text: 'Check the email address and try again in a minute.' }),
);
write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${site}/</loc></url>
  <url><loc>${site}/welcome/</loc></url>
  <url><loc>${site}/welcome/apps/</loc></url>
${addOns.map((app) => `  <url><loc>${site}/welcome/${app.id}/</loc></url>`).join('\n')}
${addOns.map((app) => `  <url><loc>${site}/${app.id}/</loc></url>`).join('\n')}
  <url><loc>${site}/lamplight/</loc></url>
  <url><loc>${site}/privacy.html</loc></url>
</urlset>
`,
);
console.log(`Wrote /welcome/, ${addOns.length} app pages, thanks, try-again and the sitemap.`);
