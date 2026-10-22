import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { contrast } from '../lamplight/color';
import { LAMP_SEEDS, ROOM_LAMP, ROOM_SEEDS, makeScheme, ownLamp, schemeVars, type LampName, type Mode, type RoomName, type Scheme } from '../lamplight/scheme';
import { THEMED_APPS, appTheme } from '../lamplight/apps';
import { wallpaperSvg } from '../app/wallpaper';
import { GLYPHS, IconButton, LampIcon, type GlyphName } from '../lamplight/icons';
import { LAMPLIGHT_CHANGES, LAMPLIGHT_VERSION } from '../lamplight/version';
import { APP_IDENTITY, LIGHT_TINTS, patternImage } from '../lamplight/identity';
import { Placeholder } from '../lamplight/Placeholder';
import { RollingNumber } from '../lamplight/RollingNumber';
import { ColumnChart, LineChart } from '../app/family/charts';

const ROOM_NAMES = Object.keys(ROOM_SEEDS) as RoomName[];
const LAMP_NAMES = Object.keys(LAMP_SEEDS) as LampName[];

const APP_NAMES: Record<string, string> = {
  askesis: 'Askesis', soma: 'Soma', oikonomia: 'Oikonomia', hydros: 'Hydros', praxis: 'Praxis', theoria: 'Theoria', diaita: 'Diaita',
  philia: 'Philia', ergon: 'Ergon', therapeia: 'Therapeia', dynamis: 'Dynamis', ktema: 'Ktema', phyton: 'Phyton', poreia: 'Poreia',
};
const APP_PLACES: Record<string, string> = {
  askesis: 'a lakeside path at sunset', soma: 'a kitchen garden', oikonomia: 'a valley at dusk', hydros: 'water at evening', praxis: 'a green study',
  theoria: 'a reading room at night', diaita: 'a night sky turning to dawn', philia: 'two trees by a warm lake', ergon: 'a house with a lit window',
  therapeia: 'a misty blue lake', dynamis: 'amber peaks', ktema: 'a barn in golden fields', phyton: 'a glasshouse in a green valley', poreia: 'a coast at dusk with a lighthouse',
};

type LampChoice = LampName | 'match' | 'own';

const PRINCIPLES: [string, string][] = [
  ['One light', 'Each page has one lamp: the main action, where you are, a link. Everything else is quiet, so the eye finds the one thing that matters.'],
  ['Made from two seeds', 'A room (the hue every surface takes) and a lamp. Every color on the page is made from those two, in dark and in light.'],
  ['Readable by construction', 'Each color is checked against every surface it sits on and moved until it passes: 7:1 for text, 4.5:1 for everything read. Any seed, any hue.'],
  ['Light, not shadow', 'Surfaces are lit from above and rest on the page. Depth comes in three steps: a card, something lifted, something brought forward.'],
  ['Surfaces, not outlines', 'Cards are a step lighter than the page, with one hairline at most. Never a box drawn around a box.'],
  ['Motion as light', 'A touch turns the light up at once; letting go dims it slowly. Sheets dim the room and leave the lamp burning at the top.'],
  ['Each app its own place', 'In a family of apps, each one is a place: a garden, a path, water. Its room and lamp come from what it is about; the structure is shared.'],
];

const MATERIALS: [string, string][] = [
  ['wall', 'deepest room surface'],
  ['page', 'the reading surface'],
  ['solid', 'cards and grouped content'],
  ['inset', 'fields and nested content'],
  ['raised', 'menus and sheets'],
  ['mica', 'bars and navigation chrome'],
  ['smoke', 'the dim under a sheet'],
];

const ROLES: { key: keyof Scheme; name: string; use: string; text?: boolean }[] = [
  { key: 'wall', name: 'wall', use: 'side rail, deepest' },
  { key: 'page', name: 'page', use: 'the page' },
  { key: 'card', name: 'card', use: 'cards, lists' },
  { key: 'inset', name: 'inset', use: 'a card in a card, fields' },
  { key: 'raised', name: 'raised', use: 'menus, sheets' },
  { key: 'ink', name: 'ink', use: 'text', text: true },
  { key: 'ink2', name: 'ink-2', use: 'secondary text', text: true },
  { key: 'ink3', name: 'ink-3', use: 'faint text', text: true },
  { key: 'lamp', name: 'lamp', use: 'links, where you are, focus', text: true },
  { key: 'lampFill', name: 'lamp-fill', use: 'the main action' },
  { key: 'onLamp', name: 'on-lamp', use: 'words on the main action' },
  { key: 'remove', name: 'remove', use: 'removing something', text: true },
];

const ratio = (n: number) => `${n.toFixed(1)}:1`;

function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <section className="g-section" id={id} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{title}</h2>
      {lead && <p className="g-lead">{lead}</p>}
      {children}
    </section>
  );
}

function tokensCss(s: Scheme): string {
  return `:root {\n${Object.entries(schemeVars(s))
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n')}\n}\n`;
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Guide() {
  const [room, setRoom] = useState<RoomName>('Hearth');
  const [lampChoice, setLampChoice] = useState<LampChoice>('match');
  const [hue, setHue] = useState(200);
  const [mode, setMode] = useState<Mode>(() => (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
  // Example figures for the motion pieces: a total that counts, a week of columns and a line that travel to new values.
  const [figure, setFigure] = useState(1250);
  const [round, setRound] = useState(0);
  const week = useMemo(() => [20, 45, 30, 60, 0, 35, 50].map((value, index) => Math.max(0, value + ((round * 17 + index * 23) % 40) - 15)), [round]);
  const trend = useMemo(() => [72.4, 72.1, 71.9, 72.2, 71.6, 71.3, 71.5, 70.9].map((value, index) => Math.round((value + (((round * 7 + index * 3) % 9) - 4) / 10) * 10) / 10), [round]);
  const [switchOn, setSwitchOn] = useState(true);
  const [chip, setChip] = useState('Week');

  const lamp = lampChoice === 'own' ? ownLamp(hue) : LAMP_SEEDS[lampChoice === 'match' ? ROOM_LAMP[room] : lampChoice];
  const s = useMemo(() => makeScheme(ROOM_SEEDS[room], lamp, mode), [room, lamp, mode]);
  const style = { ...schemeVars(s), '--g-wall': wallpaperSvg(s.art, s.page, mode === 'light', true), colorScheme: mode } as CSSProperties;
  // The page's own theme follows the choice, so motion and the browser's controls take dark or light too.
  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.background = s.page;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', s.page);
  }, [mode, s.page]);
  const lampName = lampChoice === 'own' ? `Your own (${hue}°)` : lampChoice === 'match' ? `${ROOM_LAMP[room]}, the room's own` : lampChoice;

  return (
    <div className="g" style={style} data-mode={mode}>
      <header className="g-hero">
        <div className="g-hero__inner">
          <p className="g-kicker">Proairetos design system · {LAMPLIGHT_VERSION}</p>
          <h1>Lamplight</h1>
          <p className="g-hero__lead">A room, lit by one lamp. Colors made from two seeds and readable by construction, light in place of shadow, and motion that behaves like light.</p>
          <div className="g-hero__actions">
            <a className="ll-button" href="#builder">Make a scheme</a>
            <a className="ll-button ll-button--tonal" href="#principles">Principles</a>
          </div>
        </div>
      </header>

      <main className="g-main">
        <Section id="builder" title="Make a scheme" lead="Pick a room and a lamp. Every color on this page is made from them, now.">
          <div className="g-builder ll-card">
            <div className="g-field">
              <span className="g-label">Room</span>
              <div className="g-rooms" role="radiogroup" aria-label="Room">
                {ROOM_NAMES.map((name) => {
                  const r = makeScheme(ROOM_SEEDS[name], LAMP_SEEDS[ROOM_LAMP[name]], mode);
                  return (
                    <button key={name} type="button" role="radio" aria-checked={room === name} className="g-room" onClick={() => setRoom(name)}>
                      <span className="g-room__art" style={{ backgroundImage: wallpaperSvg(r.art, r.page, mode === 'light') }} aria-hidden="true" />
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="g-field">
              <span className="g-label">Lamp</span>
              <div className="g-lamps" role="radiogroup" aria-label="Lamp">
                {(['match', ...LAMP_NAMES, 'own'] as LampChoice[]).map((name) => {
                  const seed = name === 'own' ? ownLamp(hue) : LAMP_SEEDS[name === 'match' ? ROOM_LAMP[room] : name];
                  return (
                    <button key={name} type="button" role="radio" aria-checked={lampChoice === name} className="g-lamp" onClick={() => setLampChoice(name)}>
                      <span className="g-lamp__dot" style={{ background: makeScheme(ROOM_SEEDS[room], seed, mode).lampFill }} aria-hidden="true" />
                      {name === 'match' ? 'Match' : name === 'own' ? 'Your own' : name}
                    </button>
                  );
                })}
              </div>
              {lampChoice === 'own' && (
                <label className="g-hue">
                  <span className="g-label">Hue {hue}°</span>
                  <input type="range" min={0} max={359} value={hue} onChange={(event) => setHue(Number(event.target.value))} />
                </label>
              )}
            </div>
            <div className="g-field g-field--row">
              <span className="g-label">Light</span>
              <div className="ll-chips" role="group" aria-label="Dark or light">
                {(['dark', 'light'] as Mode[]).map((m) => (
                  <button key={m} type="button" className="ll-chip" aria-pressed={mode === m} onClick={() => setMode(m)}>
                    {m === 'dark' ? 'Dark' : 'Light'}
                  </button>
                ))}
              </div>
            </div>
            <p className="g-note">
              {room} with {lampName}, {mode}. Download it as{' '}
              <button type="button" className="g-link" onClick={() => download(`lamplight-${room.toLowerCase()}-${mode}.css`, tokensCss(s), 'text/css')}>
                CSS
              </button>{' '}
              or{' '}
              <button type="button" className="g-link" onClick={() => download(`lamplight-${room.toLowerCase()}-${mode}.json`, JSON.stringify(s, null, 2), 'application/json')}>
                JSON
              </button>
              .
            </p>
          </div>
        </Section>

        <Section id="principles" title="Principles">
          <ol className="g-principles">
            {PRINCIPLES.map(([name, text]) => (
              <li key={name} className="ll-card">
                <h3>{name}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="color" title="Color roles" lead="Write rules against roles, never a raw color. The ratios are worked out live for this scheme, on the page and on a card.">
          <div className="g-roles">
            {ROLES.map(({ key, name, use, text }) => {
              const value = s[key] as string;
              return (
                <div key={name} className="g-role">
                  <span className="g-role__swatch" style={{ background: value }} aria-hidden="true">
                    {text && <span style={{ color: value }}>Aa</span>}
                  </span>
                  <span className="g-role__name">--ll-{name}</span>
                  <span className="g-role__use">{use}</span>
                  <span className="g-role__value">{value}</span>
                  {text && (
                    <span className="g-role__ratio">
                      {ratio(contrast(value, s.page))} page · {ratio(contrast(value, s.card))} card
                    </span>
                  )}
                  {key === 'onLamp' && <span className="g-role__ratio">{ratio(contrast(s.onLamp, s.lampFill))} on the lamp</span>}
                </div>
              );
            })}
          </div>
        </Section>

        <Section id="family" title="Each app its own place" lead="Proairetos takes the person's room and lamp. Every other app keeps the place it is about, made the same way and held to the same contrast.">
          <ul className="g-apps">
            {THEMED_APPS.map((app) => {
              const theme = appTheme(app)!;
              const a = makeScheme(theme.room, theme.lamp, mode);
              return (
                <li key={app} className="g-app" style={{ background: a.page, color: a.ink }}>
                  <img src={`/${app}/icons/icon-192.png`} alt="" width={40} height={40} />
                  <strong>{APP_NAMES[app]}</strong>
                  <span style={{ color: a.ink2 }}>{APP_PLACES[app]}</span>
                  <span className="g-app__swatches" aria-hidden="true">
                    <i style={{ background: a.card }} />
                    <i style={{ background: a.inset }} />
                    <i style={{ background: a.lampFill }} />
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section id="identity" title="Each app its own character" lead="Inside the shared system an app makes only these choices: the quality of its light, one faint wall pattern, its tempo, how its figures sit, one shape accent, and the one element only it has. Everything else stays shared, and every choice is held to the same contrast.">
          <ul className="g-identities">
            {['proairetos', ...THEMED_APPS].map((app) => {
              const identity = APP_IDENTITY[app];
              if (!identity) return null;
              return (
                <li key={app} className="g-identity">
                  <span className="g-identity__wall" aria-hidden="true" style={{ backgroundImage: `radial-gradient(ellipse 80% 90px at 64% -20px, color-mix(in srgb, ${LIGHT_TINTS[identity.light]} 30%, transparent), transparent 75%), ${patternImage(identity.pattern, mode)}` }} />
                  <strong>{APP_NAMES[app] ?? 'Proairetos'}</strong>
                  <span className="g-identity__line">{identity.character}</span>
                  <dl>
                    <div><dt>Light</dt><dd><i style={{ background: LIGHT_TINTS[identity.light] }} />{identity.light}</dd></div>
                    <div><dt>Pattern</dt><dd>{identity.pattern}</dd></div>
                    <div><dt>Tempo</dt><dd>{identity.tempo}</dd></div>
                    <div><dt>Figures</dt><dd>{identity.numerals}</dd></div>
                    <div><dt>Shape</dt><dd>{identity.shape}</dd></div>
                    <div><dt>Signature</dt><dd>{identity.signature}</dd></div>
                  </dl>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section id="tokens" title="Shape, space and type">
          <div className="g-specimens">
            <div className="ll-card">
              <h3>Shape</h3>
              <div className="g-radii">
                {[
                  ['xs', 8],
                  ['sm', 12],
                  ['md', 16],
                  ['lg', 22],
                  ['pill', 999],
                ].map(([name, r]) => (
                  <span key={name} className="g-radius" style={{ borderRadius: Number(r) }}>
                    {name}
                  </span>
                ))}
              </div>
              <p className="g-small">Smaller radii nest inside larger ones: a field (12) in a card (16) in a sheet (22).</p>
            </div>
            <div className="ll-card">
              <h3>Space</h3>
              <div className="g-space">
                {[4, 8, 12, 16, 24, 32, 40, 48].map((n, i) => (
                  <span key={n} title={`--ll-space-${i + 1}`}>
                    <i style={{ width: n, height: n }} />
                    {n}
                  </span>
                ))}
              </div>
              <p className="g-small">A 4-point grid, eight steps.</p>
            </div>
            <div className="ll-card g-type">
              <h3>Type</h3>
              <p style={{ font: 'var(--ll-type-display)' }}>Display, the serif</p>
              <p style={{ font: 'var(--ll-type-headline)' }}>Headline, for the person&rsquo;s own words</p>
              <p style={{ font: 'var(--ll-type-title)' }}>Title, the sans, semibold</p>
              <p style={{ font: 'var(--ll-type-body)' }}>Body. Short and plain, like a good label.</p>
              <p style={{ font: 'var(--ll-type-label)' }}>Label</p>
              <p style={{ font: 'var(--ll-type-caption)', color: 'var(--ll-ink-3)' }}>Caption</p>
            </div>
          </div>
        </Section>

        <Section id="layout" title="Layout" lead="Five patterns, one rhythm. Every screen in the family is one of them, on the same four numbers.">
          <dl className="g-motion">
            <div><dt>--ll-gutter</dt><dd>20 px · the side margin, on every page and sheet</dd></div>
            <div><dt>--ll-gap</dt><dd>16 px · between things in a section</dd></div>
            <div><dt>--ll-section-gap</dt><dd>28 px · between sections</dd></div>
            <div><dt>--ll-label-gap</dt><dd>8 px · from a section&rsquo;s label to what it labels</dd></div>
          </dl>
          <dl className="g-motion">
            <div><dt>Home</dt><dd>A band of the app&rsquo;s scene or its title, then sections</dd></div>
            <div><dt>List</dt><dd>A title, then one grouped list or cards, sections apart</dd></div>
            <div><dt>Detail</dt><dd>A back link, a title, the facts, then actions at the foot</dd></div>
            <div><dt>Settings</dt><dd>Labels outside, grouped rows inside, a tile per row</dd></div>
            <div><dt>Sheet</dt><dd>A title row, the body on the same gutter, actions last</dd></div>
          </dl>
          <p className="g-small">Text is never under 12 px; tab labels never under 11 px. An empty list is a lit mark, a title, one line and at most one action, with no box around it.</p>
        </Section>

        <Section id="light" title="Light, not shadow" lead="Three steps. Each surface is lit along its top edge and rests on the page beneath it.">
          <div className="g-lights">
            {[1, 2, 3].map((n) => (
              <div key={n} className="g-light" style={{ boxShadow: `var(--ll-light-${n})` }}>
                <strong>--ll-light-{n}</strong>
                <span>{['A card', 'Something lifted: a menu', 'Something brought forward: a sheet'][n - 1]}</span>
              </div>
            ))}
            <div className="g-light g-light--lamp">
              <strong>--ll-lamp-light</strong>
              <span>The lamp&rsquo;s own light, on the main action</span>
            </div>
          </div>
        </Section>

        <Section id="materials" title="Material tiers" lead="Choose the surface's place in the room first. Shape, light and motion can then stay consistent across apps.">
          <div className="g-materials">
            {MATERIALS.map(([name, use]) => (
              <div key={name} className={`g-material ll-material--${name}`}>
                <strong>--ll-material-{name}</strong>
                <span>{use}</span>
              </div>
            ))}
            <div className="g-material ll-mica">
              <strong>.ll-mica</strong>
              <span>optional room-tinted depth for new chrome</span>
            </div>
            <div className="g-material ll-mica--strong">
              <strong>.ll-mica--strong</strong>
              <span>raised Mica fallback for a forward surface</span>
            </div>
          </div>
        </Section>

        <Section id="components" title="Components" lead="Built only from the tokens. Press and hold any of them to see the light.">
          <div className="g-components">
            <div className="ll-card g-stack">
              <h3>Buttons</h3>
              <div className="g-row">
                <button type="button" className="ll-button">
                  Save
                </button>
                <button type="button" className="ll-button ll-button--tonal">
                  Add a step
                </button>
                <button type="button" className="ll-button ll-button--plain">
                  Not now
                </button>
                <button type="button" className="ll-button ll-button--remove">
                  Remove
                </button>
              </div>
              <div className="g-row">
                <button type="button" className="ll-button ll-button--sm">Compact</button>
                <button type="button" className="ll-button ll-button--lg">Large</button>
              </div>
              <p className="g-small">One lit action per screen. The rest are tonal or plain. Removing is never shown as a failure. Compact controls keep a 44px target on touch devices.</p>
            </div>

            <div className="g-stack">
              <h3 className="g-h3">A grouped list</h3>
              <ul className="ll-list">
                <li className="ll-row">
                  <span className="ll-row__tile" aria-hidden="true">
                    ☼
                  </span>
                  <span className="ll-row__text">Morning light</span>
                  <button type="button" role="switch" aria-checked={switchOn} aria-label="Morning light" className="ll-switch" onClick={() => setSwitchOn(!switchOn)} />
                </li>
                <li className="ll-row">
                  <span className="ll-row__tile" aria-hidden="true">
                    ◷
                  </span>
                  <span className="ll-row__text">
                    Wind down
                    <br />
                    <span className="ll-row__detail">30 minutes before sleep</span>
                  </span>
                </li>
                <li className="ll-row">
                  <span className="ll-row__tile" aria-hidden="true">
                    ✎
                  </span>
                  <span className="ll-row__text">Notes</span>
                  <span className="ll-row__detail">Off</span>
                </li>
              </ul>
            </div>

            <div className="ll-card g-stack">
              <h3>Fields and chips</h3>
              <input className="ll-field ll-field--sm" placeholder="Compact field" aria-label="Compact field" />
              <input className="ll-field ll-field--lg" placeholder="Write it down" aria-label="Write it down" aria-invalid="true" />
              <div className="g-row">
                {['Day', 'Week', 'Month'].map((c) => (
                  <button key={c} type="button" className="ll-chip" aria-pressed={chip === c} onClick={() => setChip(c)}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="g-stack">
              <h3 className="g-h3">The bar</h3>
              <nav className="ll-bar" aria-label="Example">
                {['Today', 'Reflect', 'Days ahead', 'Capture'].map((name, i) => (
                  <button key={name} type="button" className="ll-bar__item" aria-current={i === 0 ? 'page' : undefined}>
                    <span aria-hidden="true">{['☼', '❍', '▦', '+'][i]}</span>
                    {name}
                  </button>
                ))}
              </nav>
              <h3 className="g-h3">A sheet</h3>
              <div className="g-sheet-stage">
                <div className="ll-sheet">
                  <div className="ll-sheet__grip" aria-hidden="true" />
                  <h3>New highlight</h3>
                  <input className="ll-field" placeholder="A line worth keeping" aria-label="A line worth keeping" />
                  <div className="g-row g-row--end">
                    <button type="button" className="ll-button ll-button--plain">
                      Cancel
                    </button>
                    <button type="button" className="ll-button">
                      Keep it
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section id="primitives" title="System primitives" lead="These states are shared contracts for the apps: icon actions, segmented choices, progress, loading, messages and empty states.">
          <div className="g-components">
            <div className="ll-card g-stack">
              <h3>Icon actions</h3>
              <div className="g-row">
                <IconButton label="Search"><LampIcon glyph={GLYPHS.search} size={20} /></IconButton>
                <IconButton label="Favorite" aria-pressed="true"><LampIcon glyph={GLYPHS.heart} size={20} /></IconButton>
                <IconButton label="More" size="sm"><LampIcon glyph={GLYPHS.more} size={18} /></IconButton>
              </div>
              <p className="g-small">The button owns the accessible name and the 44px touch target; the icon remains decorative.</p>
            </div>

            <div className="ll-card g-stack">
              <h3>Segmented choice</h3>
              <div className="ll-segmented" role="tablist" aria-label="Range">
                {['Day', 'Week', 'Month'].map((name) => <button key={name} type="button" className="ll-segmented__item" role="tab" aria-selected={name === 'Week'}>{name}</button>)}
              </div>
              <div className="ll-progress" role="progressbar" aria-label="Weekly progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={68} style={{ '--ll-progress': '68%' } as CSSProperties}><span className="ll-progress__value" /></div>
            </div>

            <div className="ll-card g-stack">
              <h3>Loading and feedback</h3>
              <Placeholder label="An example of waiting" kind="lines" count={3} />
              <div className="ll-snackbar"><span className="ll-snackbar__text">“Stretch” deleted</span><button type="button" className="ll-snackbar__action">Undo</button></div>
              <p className="g-figure">
                <RollingNumber value={figure} format={(n) => `${Math.round(n).toLocaleString()} ml`} />
                <button type="button" className="ll-button ll-button--tonal" onClick={() => setFigure((value) => value + 250)}>Add 250</button>
              </p>
            </div>

            <div className="ll-card g-stack g-charts">
              <h3>Charts</h3>
              <ColumnChart title="Minutes, last 7 days" unit="min" days={week.map((value, index) => ({ label: 'MTWTFSS'[index], long: `Day ${index + 1}`, value }))} />
              <LineChart title="Weight, kg" series={[{ name: 'Weight' }]} points={trend.map((value, index) => ({ at: Date.UTC(2026, 8, 1 + index * 4), values: [value] }))} />
              <button type="button" className="ll-button ll-button--tonal" onClick={() => setRound((value) => value + 1)}>New values</button>
            </div>

            <div className="ll-card g-stack">
              <h3>Dialog and empty state</h3>
              <div className="ll-dialog">
                <h4 className="ll-dialog__title">Delete this entry?</h4>
                <p className="ll-dialog__body">It will be removed from this device.</p>
                <div className="ll-dialog__actions"><button type="button" className="ll-button ll-button--plain">Cancel</button><button type="button" className="ll-button ll-button--remove">Delete</button></div>
              </div>
              <div className="ll-empty"><span className="ll-empty__icon"><LampIcon glyph={GLYPHS.book} size={28} /></span><h4 className="ll-empty__title">Nothing here yet</h4><p className="ll-empty__body">A short explanation and one clear next action.</p></div>
            </div>
          </div>
        </Section>

        <Section id="icons" title="Icons" lead="One drawing rule for every app: a 24 grid, optical sizes from inline to hero, one scaled stroke, round ends and joins. Icon actions supply the touch target and accessible name; the icon of the page you are on fills softly with the lamp from inside.">
          <ul className="g-icons">
            {(Object.keys(GLYPHS) as GlyphName[]).map((name) => (
              <li key={name}>
                <span className="g-icons__pair" aria-hidden="true">
                  <LampIcon glyph={GLYPHS[name]} size={28} />
                  <LampIcon glyph={GLYPHS[name]} size={28} className="ll-icon--lit g-icons__lit" />
                </span>
                {name}
              </li>
            ))}
          </ul>
        </Section>

        <Section id="motion" title="Motion as light" lead="Light turns up fast and down slowly. With reduced motion set on the device, it simply comes and goes.">
          <dl className="g-motion">
            <div><dt>--ll-quick</dt><dd>120 ms · the light coming up under a finger</dd></div>
            <div><dt>--ll-calm</dt><dd>240 ms · a switch, a chip, a tab</dd></div>
            <div><dt>--ll-slow</dt><dd>420 ms · a page arriving</dd></div>
            <div><dt>--ll-dim</dt><dd>640 ms · the light fading after a press; a sheet dimming the room</dd></div>
            <div><dt>A card opens</dt><dd>The card tapped grows into the new page&rsquo;s title while the page arrives</dd></div>
            <div><dt>The tab hands off</dt><dd>The new tab lights at once and the old one dims slowly, so the light passes along the bar</dd></div>
            <div><dt>Held</dt><dd>A sheet pulled down or a page swiped from the left edge follows the finger; a third of the way or a flick finishes it, less springs back past its place and settles</dd></div>
            <div><dt>Lists</dt><dd>When a tap adds, finishes or takes away a row, the rows around it glide to their places; a new one fades up, one taken away fades where it was</dd></div>
            <div><dt>Figures</dt><dd>A total counts to its new value; screen readers hear only where it lands</dd></div>
            <div><dt>Bars and lines</dt><dd>Columns rise from their baseline one after another, lit on their caps; a line draws itself in and its newest point gives one ripple; new values travel rather than jump</dd></div>
            <div><dt>Where you are</dt><dd>The lamp&rsquo;s line along the dock&rsquo;s top edge glides to the new place and stretches a little on the way</dd></div>
            <div><dt>Pulled far enough</dt><dd>A row pulled to its action lights up and gives one small tap as the line is crossed</dd></div>
            <div><dt>The large title</dt><dd>On phones a page&rsquo;s title folds into a compact bar as it scrolls under the top, with a back chevron when there is a way back</dd></div>
          </dl>
        </Section>

        <Section id="states" title="States" lead="Every control uses the same interaction states, made the same way.">
          <dl className="g-motion">
            <div><dt>Rest</dt><dd>The main action is the lamp&rsquo;s pill; everything else is tonal or quiet. One lit thing per screen.</dd></div>
            <div><dt>Pressed</dt><dd>It brightens at once (--ll-quick) and dims slowly (--ll-dim) when let go; with Gentle taps on, a light haptic too.</dd></div>
            <div><dt>Focused</dt><dd>A ring of the lamp (--ll-focus), only from the keyboard (:focus-visible).</dd></div>
            <div><dt>Chosen</dt><dd>A chip, tab or row that is chosen takes the lamp&rsquo;s glow and its icon is lit; never color alone: a check, a filled icon or bold words go with it.</dd></div>
            <div><dt>Disabled</dt><dd>Half the ink, no light, no press; it stays readable and says why nearby when it is not plain.</dd></div>
            <div><dt>Invalid</dt><dd>A field keeps its place and gets the remove ring; its nearby message explains what needs attention.</dd></div>
            <div><dt>Held</dt><dd>A row or sheet being held takes the dragged layer and settles back or completes with the same spring.</dd></div>
          </dl>
          <div className="g-row">
            <button className="ll-button" type="button">Rest</button>
            <button className="ll-button ll-button--tonal" type="button">Tonal</button>
            <button className="ll-button" type="button" disabled>Disabled</button>
          </div>
        </Section>

        <Section id="access" title="Accessibility" lead="Built in, so a screen made of Lamplight is accessible without extra work.">
          <dl className="g-motion">
            <div><dt>Contrast</dt><dd>Text 7:1, everything else read 4.5:1, on every surface it sits on, in every room and lamp, by construction and by test.</dd></div>
            <div><dt>Touch</dt><dd>Every control at least 44 by 44 points.</dd></div>
            <div><dt>Size</dt><dd>Everything is in rem, so the person&rsquo;s text size moves type and space together; nothing under 12 px.</dd></div>
            <div><dt>Motion</dt><dd>Reduced motion: no travel, light simply comes and goes. Reduced transparency: bars and sheets go solid.</dd></div>
            <div><dt>Words</dt><dd>Icon buttons carry a label; state is never shown by color alone; headings in order, one title per page.</dd></div>
          </dl>
        </Section>

        <Section id="versions" title="Versions">
          <dl className="g-motion">
            {LAMPLIGHT_CHANGES.map((change) => (
              <div key={change.version}><dt>{change.version}</dt><dd>{change.lines.join(' ')}</dd></div>
            ))}
          </dl>
        </Section>

        <Section id="use" title="Using it">
          <pre className="g-code">
            <code>{`/* Every rule is written against roles. */
.save {
  background: var(--ll-lamp-fill);
  color: var(--ll-on-lamp);
  border-radius: var(--ll-radius-pill);
  box-shadow: var(--ll-lamp-light);
}

/* A scheme from seeds (src/lamplight/scheme.ts). */
const scheme = makeScheme(ROOM_SEEDS.Harbor, ownLamp(300), 'dark');
for (const [name, value] of Object.entries(schemeVars(scheme)))
  document.documentElement.style.setProperty(name, value);`}</code>
          </pre>
        </Section>
      </main>

      <footer className="g-footer">
        <a href="/welcome/">The apps</a>
        <a href="/">Proairetos</a>
        <a href="/privacy.html">Privacy</a>
      </footer>
    </div>
  );
}
