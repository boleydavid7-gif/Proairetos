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
    line: 'A calm planner for your days',
    card: 'To-dos, your calendar and a journal, on any schedule.',
    about: 'Write it down, plan your week and look back on how it went. Proairetos fits any schedule, from nine to five to nights, and never nags.',
    points: [
      ['Today', 'Your plans, your to-dos and the free time between them, on one screen.'],
      ['Any schedule', 'Days, evenings, nights or no set hours. Your day starts when you say it does.'],
      ['Reflect', 'Keep a journal, note three good things each evening and look back on your week.'],
      ['Compass', 'The values you care about, the goals you’re working toward and the people who matter.'],
    ],
  },
  {
    id: 'askesis', name: 'Askesis', icon: '/askesis/icons/icon-192.png', category: 'HealthApplication',
    ground: '#0b0f0e', accent: '#86d9b0', ink: '#e8ece9',
    line: 'A running plan for every level',
    card: 'A running plan that starts where you are, from your first walk-run to your first marathon.',
    about: 'A running plan that starts where you are and builds toward your goal: a 5K, a marathon, a time or just running regularly.',
    points: [
      ['A plan that fits you', 'A quick test sets your first week. Each week builds a little, with an easier week every fourth.'],
      ['Guided runs', 'Bells tell you when to run and walk, even with your screen locked. Play your own music.'],
      ['Your log', 'Every run with its distance and how it felt, plus your longest and fastest.'],
      ['Easy days', 'Swap any session for a lighter one. You decide when to move on to the next week.'],
    ],
  },
  {
    id: 'soma', name: 'Soma', icon: '/soma/icons/icon-192.png', category: 'LifestyleApplication',
    ground: '#f3ede2', accent: '#2f5a3e', ink: '#2f5a3e',
    line: 'Recipes, meal plans and groceries',
    card: 'Save recipes from anywhere, plan the week and shop from a list sorted by aisle.',
    about: 'Save recipes from any website, a photo or another app. Plan the week, then shop from a list sorted by aisle.',
    points: [
      ['Save from anywhere', 'Paste a link, snap a recipe card or bring in your Paprika or Mela library.'],
      ['Grocery list', 'Add a recipe’s ingredients in one tap, sorted by aisle. Share the list with whoever shops with you.'],
      ['Plan the week', 'Put meals on days, repeat last week and see what to use up first.'],
      ['Nutrition', 'A Nutri-Score and nutrients per serving for every recipe.'],
    ],
  },
  {
    id: 'oikonomia', name: 'Oikonomia', icon: '/oikonomia/icons/icon-192.png', category: 'FinanceApplication',
    ground: '#0d1110', accent: '#d79572', ink: '#f2eee6',
    line: 'Bills, budgets and spending',
    card: 'Every bill and subscription in one place, with a reminder before each one is due.',
    about: 'Every bill and subscription in one place, a simple monthly budget and a clear view of what you actually spent.',
    points: [
      ['Bills', 'See what’s due next and get a reminder before each one. Swipe to mark it paid.'],
      ['Payday', 'Your next payday and the bills due before it, with what’s left after them.'],
      ['Spending', 'Import a bank or card statement. Each purchase is sorted into your categories.'],
      ['Monthly budget', 'Set amounts by category and see what you spent next to them.'],
    ],
  },
  {
    id: 'theoria', name: 'Theoria', icon: '/theoria/icons/icon-192.png', category: 'BookApplication',
    ground: '#0b1020', accent: '#d9b46a', ink: '#ede5d3',
    line: 'Read books and PDFs, keep your highlights',
    card: 'Read your books and PDFs and keep your highlights and notes in one place.',
    about: 'Read your own books and PDFs on any device, with your highlights and notes kept alongside them.',
    points: [
      ['Your library', 'EPUB, PDF, text and Markdown, with shelves and search.'],
      ['Highlights and notes', 'Highlight passages, add notes and export them as Markdown.'],
      ['Kindle and Readwise', 'Import your Kindle highlights or a Readwise export.'],
      ['Cloud folder', 'Point it at a folder in OneDrive, Google Drive or Dropbox and your books appear on your shelf.'],
      ['Reading timer', 'Timed reading sessions with a bell, flashcards and your reading time by day.'],
    ],
  },
  {
    id: 'diaita', name: 'Diaita', icon: '/diaita/icons/icon-192.png', category: 'HealthApplication',
    ground: '#0e1014', accent: '#e2b26e', ink: '#ece8e1',
    line: 'Sleep and energy, around your schedule',
    card: 'When to sleep, nap, get light, stop caffeine and eat, planned around your schedule.',
    about: 'A daily plan for sleep, naps, light, caffeine and meals that follows your real schedule, night shifts included. Every suggestion links to its source.',
    points: [
      ['Fits your schedule', 'Bedtime, wind-down and your last coffee move with your days, evenings and nights.'],
      ['Night shifts', 'When to nap before your first night, when to seek light and how to sleep after your last.'],
      ['Wind down', 'A 10 to 20 minute wind-down with sounds, and a dim screen for when you can’t sleep.'],
      ['Backed by research', 'Every suggestion links to the study behind it.'],
    ],
  },
  {
    id: 'philia', name: 'Philia', icon: '/philia/icons/icon-192.png', category: 'LifestyleApplication',
    ground: '#120f10', accent: '#e39a8f', ink: '#f0e8e4',
    line: 'Birthdays and staying in touch',
    card: 'Birthdays, gift ideas and staying in touch with the people you care about.',
    about: 'Remember birthdays, keep gift ideas and stay in touch with the people you care about.',
    points: [
      ['Coming up', 'Birthdays and other dates in the next month, with reminders if you want them.'],
      ['Stay in touch', 'Pick how often you’d like to catch up with someone and see how long it’s been.'],
      ['One tap', 'Log a call, a message or a visit in one tap. Each person gets their own timeline.'],
      ['Gift ideas', 'Save ideas when they come to you and mark them when given.'],
    ],
  },
  {
    id: 'ergon', name: 'Ergon', icon: '/ergon/icons/icon-192.png', category: 'LifestyleApplication',
    ground: '#0e1112', accent: '#8fc1b5', ink: '#e9ece8',
    line: 'Chores, shared with your household',
    card: 'Chores that repeat when they’re due, shared with everyone you live with.',
    about: 'Chores that come back when they’re due, shared with everyone you live with, with turns when you want them.',
    points: [
      ['Repeats', 'Every few days, on set weekdays, monthly or once, counted from when it was last done.'],
      ['Shared', 'One list for your whole household, end-to-end encrypted.'],
      ['Take turns', 'A chore can pass to the next person each time it’s done.'],
      ['Steps and rooms', 'Break bigger chores into steps and group chores by room.'],
    ],
  },
  {
    id: 'therapeia', name: 'Therapeia', icon: '/therapeia/icons/icon-192.png', category: 'HealthApplication',
    ground: '#10141a', accent: '#9cb8e0', ink: '#e8edf4',
    line: 'Medicines and appointments',
    card: 'Medicine reminders, refills and appointments, with your questions ready.',
    about: 'Medicine reminders at the times you set or around your sleep, plus refills, appointments and the questions you want to ask. Therapeia doesn’t give medical advice.',
    points: [
      ['Dose times', 'At a set time, after waking or before bed, so doses follow a night shift.'],
      ['Refills', 'Your supply counts down as you take doses, with a reminder before you run out.'],
      ['Appointments', 'Questions to ask, notes and a printable list of your medicines.'],
      ['Family and carers', 'Track medicines for family members and share the list with someone who helps.'],
    ],
  },
  {
    id: 'dynamis', name: 'Dynamis', icon: '/dynamis/icons/icon-192.png', category: 'HealthApplication',
    ground: '#141110', accent: '#e0a36b', ink: '#f2ebe4',
    line: 'Strength training and mobility',
    card: 'Strength workouts built on research, with every set logged.',
    about: 'Full-body strength workouts built on research, with sets, weights and rest times logged as you go, plus short mobility routines.',
    points: [
      ['Built on research', 'Each muscle group twice a week, reps matched to your goal.'],
      ['Gym or home', 'Train at the gym, with dumbbells at home or with no equipment. Swap any exercise.'],
      ['Every set logged', 'A rest timer, plus each exercise’s history and personal bests.'],
      ['You decide', 'When you hit the top of your rep range, more weight is suggested. Take it or leave it.'],
    ],
  },
  {
    id: 'ktema', name: 'Ktema', icon: '/ktema/icons/icon-192.png', category: 'LifestyleApplication',
    ground: '#12130f', accent: '#c7b37a', ink: '#efece2',
    line: 'Home, car and belongings',
    card: 'Warranties, manuals and upkeep for your home and car in one place.',
    about: 'Warranties, model numbers and manuals in one place, with reminders for home and car maintenance by date or mileage.',
    points: [
      ['Your things', 'Make, model, serial number, receipt, manual and photos.'],
      ['Warranties', 'A reminder a month before a warranty or document expires.'],
      ['Maintenance', 'Filters, oil changes and more, by date or by mileage.'],
      ['Insurance list', 'Everything by room with prices, ready to print or download.'],
    ],
  },
  {
    id: 'phyton', name: 'Phyton', icon: '/phyton/icons/icon-192.png', category: 'LifestyleApplication',
    ground: '#0f1410', accent: '#9fc48a', ink: '#ecf0e6',
    line: 'Plant care and watering',
    card: 'Water each plant when it needs it, and identify plants from a photo.',
    about: 'Phyton reminds you to check each plant when its soil is likely dry, and learns from when you actually water. Identify a plant from a photo.',
    points: [
      ['Learns your plants', 'Mark watered or still moist, and the timing adjusts to what you do.'],
      ['Identify', 'Name a plant from a photo, with care notes for about 85 types.'],
      ['Outdoor plants', 'Rain counts as watering, and you get a heads-up when frost is on the way.'],
      ['Going away', 'A care sheet for whoever waters while you’re gone.'],
    ],
  },
  {
    id: 'poreia', name: 'Poreia', icon: '/poreia/icons/icon-192.png', category: 'TravelApplication',
    ground: '#071c24', accent: '#4cc3c7', ink: '#e8f5f2',
    line: 'Trip planning and time off',
    card: 'Plan a trip from the first idea to the flight home: bookings, day plans, packing and costs.',
    about: 'Plan a trip from the first idea to the flight home. Bookings, day plans, maps, packing and shared costs in one place, plus your time off.',
    points: [
      ['Day by day', 'Each day with its forecast, travel times between places and your free time.'],
      ['Bookings from anywhere', 'Paste a confirmation or add a PDF, screenshot or calendar invite. It lands on the right day.'],
      ['Travel together', 'Share a trip with the people going: the same plans, packing list and costs, and who paid what.'],
      ['Around you', 'A map of places to see, eat and stay, plus events during your trip, with directions.'],
      ['Time off', 'Your balance and how it grows, with each trip’s hours counted from your work schedule.'],
      ['With Proairetos', 'Time off clears those shifts from your schedule, and trips show on your Today.'],
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

/** Where a free trial starts: Proairetos's account page (an account carries the trial to every app). */
const TRIAL = '/?open=account';

/** The newsletter form: an email, nothing else. Works with no script; posts to the waitlist Worker as a newsletter yes. */
const waitlist = ({ source, picked = [] }) => `
      <section class="wrap" id="waitlist" aria-labelledby="waitlist-title">
        <form class="waitlist" method="post" action="/api/waitlist">
          <h2 id="waitlist-title">Newsletter</h2>
          <p>News about Proairetos and new apps, a few times a year.</p>
          <input type="hidden" name="source" value="${source}" />
          <input type="hidden" name="letters" value="yes" />${picked.map((id) => `\n          <input type="hidden" name="apps" value="${id}" />`).join('')}
          <div class="hidden-field" aria-hidden="true"><label>Website <input type="text" name="website" tabindex="-1" autocomplete="off" /></label></div>
          <div class="waitlist__row">
            <label class="hidden-field" for="waitlist-email">Email</label>
            <input id="waitlist-email" type="email" name="email" required autocomplete="email" placeholder="you@example.com" />
            <button class="button" type="submit">Sign up</button>
          </div>
          <small>Used only for the newsletter. To stop it, reply to any issue. <a href="/privacy.html#waitlist">Privacy</a></small>
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
            <p>Works without an account or a connection. Nothing leaves your device unless you turn on sync.</p>
          </div>
          <div>
            <h3>Encrypted if you sync</h3>
            <p>Your data is encrypted on your device with a key only you have. We can’t read it.</p>
          </div>
          <div>
            <h3>No scores or streaks</h3>
            <p>No badges, points or rankings.</p>
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
    'A calm planner for your days. Capture to-dos, plan your week around your schedule and keep a short journal. Free and private.';
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
        <h1>A calm home for your days</h1>
        <p class="lead">Write it down, plan your week and look back on how it went. Proairetos fits any schedule and never nags.</p>
        <div class="actions">
          <a class="button button--main" href="${TRIAL}">Start your free trial</a>
          <a class="button" href="#how">Take a look</a>
        </div>
        <p class="fine">Every app free for 7 days. No card needed. Works on iPhone, Android and computer.</p>
      </div>
      <div class="hero__phone"><img src="/screenshots/narrow-1.webp" alt="Proairetos Today: an intention for the day, the day’s plans and the open time between them" width="390" height="844" /></div>
    </header>

    <main>
      <section class="wrap" id="how" aria-labelledby="how-title">
        <h2 id="how-title">What you can do</h2>
        <div class="tour">
          <div class="tour__row">
            <div>
              <h3>Capture in seconds</h3>
              <p>Type “dentist Friday 3pm” and it’s on Friday at 3 with a reminder. Not sure what something is yet? Write it down and sort it later.</p>
            </div>
            <img src="/screenshots/wide-1.webp" alt="Proairetos on a computer: today’s intention, the day’s plans and the open time" width="1280" height="800" />
          </div>
          <div class="tour__row tour__row--flip tour__row--phone">
            <img src="/screenshots/narrow-2.webp" alt="Days ahead: the week as a list, with timed plans and to-dos under each day" width="390" height="844" />
            <div>
              <h3>Plan around your real week</h3>
              <p>See today’s plans, your to-dos and the free time between them. Days, evenings, nights or no set hours: your day starts when you say it does.</p>
            </div>
          </div>
          <div class="tour__row">
            <div>
              <h3>Look back</h3>
              <p>Keep a short journal, note three good things at the end of the day and record the decisions you make.</p>
            </div>
            <div class="ways">
              <div><h3>No guilt list</h3><p>Unfinished things don’t turn red or pile up. Move them, keep them or let them go.</p></div>
              <div><h3>Private by default</h3><p>Your data stays on your device. Sync is optional and end-to-end encrypted.</p></div>
            </div>
          </div>
        </div>
      </section>

      <section class="wrap" aria-labelledby="family-title">
        <h2 id="family-title">Add the apps you need</h2>
        <p class="lead" style="margin-top:-0.4rem;margin-bottom:1.4rem">Running, recipes, bills, travel and more. Each app you add shows up on your Today, so your whole day is in one place.</p>
        <ul class="apps apps--featured">
${featured.map(appCard).join('\n')}
        </ul>
        <p class="more"><a class="button" href="/welcome/apps/">See all ${addOns.length} apps</a></p>
      </section>

      <section class="wrap" aria-labelledby="prices-title">
        <h2 id="prices-title">Prices</h2>
        <p class="lead" style="margin-top:-0.4rem;margin-bottom:1.4rem">Make an account and every app is free for 7 days. No card needed.</p>
        <div class="prices">
          <div class="price price--free"><b>Proairetos</b><strong>Free</strong><span>To-dos, calendar, journal and values. Free for good.</span></div>
          <div class="price"><b>Core apps</b><strong>${dollars('core')}/mo</strong><span>All the apps except Soma and Phyton.</span></div>
          <div class="price"><b>Soma</b><strong>${dollars('soma')}/mo</strong><span>Recipes, meal plans and grocery lists.</span></div>
          <div class="price"><b>Phyton</b><strong>${dollars('phyton')}/mo</strong><span>Plant care, with identification from a photo. Get both for ${dollars('bundle')}/mo.</span></div>
          <div class="price"><b>Proairetos cloud</b><strong>${dollars('cloud')}/mo</strong><span>Encrypted sync and backup. Or sync for free with your own Google Drive, Dropbox or OneDrive.</span></div>
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
      <h1>All the apps</h1>
      <p class="lead">Proairetos is free. Add the apps you need: each works on its own and shows up on your Today.</p>
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
            <a class="button button--main" href="${TRIAL}">Start your free trial</a>
            <a class="button" href="${hrefOf(app)}">Open ${app.name}</a>
          </div>
        </div>${first ? `\n        <img class="phone" src="${first.src}" alt="${app.name} on a phone" width="300" height="650" />` : ''}
      </header>

      <section class="wrap" aria-labelledby="what">
        <h2 id="what">Features</h2>
        <ul class="points">
${app.points.map(([name, text]) => `          <li><h3>${esc(name)}</h3><p>${esc(text)}</p></li>`).join('\n')}
        </ul>
      </section>${
        others.length
          ? `

      <section class="wrap" aria-labelledby="look">
        <h2 id="look">Screenshots</h2>
        <div class="shots">
${others.map((shot) => `          <img src="${shot.src}" alt="${app.name}${shot.wide ? ' on a computer' : ' on a phone'}" />`).join('\n')}
        </div>
      </section>`
          : ''
      }

      <section class="wrap" aria-labelledby="install-title">
        <h2 id="install-title">Works on every device</h2>
        <p class="lead">Open ${app.name} in your browser on iPhone, Android or a computer, and add it to your Home Screen. Nothing to download. <a href="/welcome/#install">How to add it</a></p>
      </section>
${waitlist({ source: app.id, picked: [app.id], choose: false })}
${privacyNotes}

      <section class="wrap" aria-labelledby="family">
        <h2 id="family">${app.id === 'proairetos' ? 'Works with these apps' : 'More from Proairetos'}</h2>
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
  plainPage({ path: '/welcome/thanks/', title: 'You’re signed up', heading: 'You’re signed up', text: 'The next newsletter comes to your inbox. Every app is free to try for 7 days.' }),
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
