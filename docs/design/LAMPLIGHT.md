# Lamplight

The design system behind Proairetos and its family: a room, lit by one lamp. Its public guide is
https://proairetos.com/lamplight/ (`lamplight/index.html` → `src/lamplight-guide/`), a live theme builder that
uses the same code as the apps.

## Principles

- **One light.** Each page has one lamp: the main action, where you are, a link. Everything else is quiet.
- **Made from two seeds.** A room (the hue every surface takes) and a lamp. Every color is made from them, in dark
  and in light.
- **Readable by construction.** Each color is checked against every surface it sits on and moved in lightness until
  it passes: 7:1 for text, 4.5:1 for everything read, 4.5:1 for words on the lamp. Any seed, any hue.
- **Light, not shadow.** Surfaces are lit along their top edge and rest on the page. Three steps of depth.
- **Surfaces, not outlines.** Cards are a step lighter than the page, one hairline at most.
- **Motion as light.** A touch turns the light up at once; letting go dims it slowly. Sheets dim the room and leave
  the lamp at the top.
- **Each app its own place.** Proairetos takes the person's room and lamp. Every other app keeps the place it is
  about (Soma's garden, Askesis's lakeside path, Hydros's water); its room and lamp come from its own colors, made
  the same way and held to the same contrast.

## Code

| File | What it holds |
| --- | --- |
| `src/lamplight/color.ts` | OKLCH to sRGB (chroma lowered until it fits), hex to OKLCH, WCAG contrast |
| `src/lamplight/scheme.ts` | Seeds (`ROOM_SEEDS`, `LAMP_SEEDS`, `ROOM_LAMP`, `ownLamp`), `makeScheme(room, lamp, mode)`, `schemeVars` (`--ll-*`) |
| `src/lamplight/materials.css` | The material contract: wall, page, solid, inset, raised, mica and smoke roles, with reduced-transparency fallbacks |
| `src/lamplight/apps.ts` | Each app's theme (`appTheme`): a room and Lamplight signature lamp |
| `src/lamplight/palette.ts` | Canonical neutral foundation, signature families and generated 50–950 tonal scales, app assignments, and status colors |
| `src/lamplight/family.ts` | The bridge: each app's own color names set from the scheme (`familyVars`); `ALWAYS_DARK` (Praxis, Theoria) |
| `src/lamplight/tokens.css` | Shape, space, type roles, light (depth), motion, focus |
| `src/lamplight/components.css` | `.ll-button` (+ `--tonal`, `--plain`, `--remove`), `.ll-card`, `.ll-list`/`.ll-row`, `.ll-switch`, `.ll-field`, `.ll-chip`, `.ll-bar`, `.ll-sheet` |
| `src/lamplight/motion.css` | Press brightens and dims slowly; sheets dim the room |
| `src/lamplight/adopt.css` | The shared pieces the apps already use (`.card`, `.rows`, `.button-main`, `.button-accent`, `.button-quiet`, `.button-danger`, `.chip`, `.input`, `.field-input`, `.switch`, sheets) take shape, light, focus and tonal choices from the tokens, matching their `.ll-*` twins; layout untouched |
| `src/lamplight/icons.tsx`, `icons.css` | The family's line icons: `LampIcon` (24 grid, 1.7 stroke, round ends and joins), `GLYPHS` (the shared icons, drawn once), `glyphIcon(name, size)`, `lampIcon(line, lit)`; every app's icon module draws through it and re-exports the shared glyphs under its own names |
| `src/app/lamplight.ts` | `applyLamplight(appearance, light, app)`: sets the scheme on the root, Proairetos's wallpaper and foot |

Every app's `main` (or `startApp`) registers `withLamplight((look, light) => applyLamplight(look, light, app))`;
`premium.css` imports the shared stylesheets, so every app has the materials, tokens, components and motion. Tests:
`src/tests/lamplight/scheme.test.ts` (presets kept, every room × 32 lamps × dark/light readable, every app theme
readable).

## Color registry

The shared neutral foundation is Midnight `#101923`, Navy `#1B2A38`, Warm Mica `#283642`, Linen `#E9E5DC` and
Stone `#A7ADA9` in dark mode. Light mode uses warm paper `#F4F1EA`, warm white `#FFFCF7`, raised paper `#F0ECE4`,
deep ink `#1D2730` and slate `#56616A`. App rooms may carry a restrained tint, while these values remain the canonical
anchors and fallbacks.

Lamplight's signature families are Blue `#4F78A8`, Green `#5E8B68`, Aqua `#3A9CA0`, Violet `#7E6A9E`, Amber `#B9823D`
and Coral `#C27669`. Each family has a generated OKLCH scale at 50, 100, 200, 300, 400, 500, 600, 700, 800, 900 and
950; the 500 value is its identity seed. The registry and assignments live in `src/lamplight/palette.ts`.

Each app also keeps an icon-inspired seed in the registry so the shared family tones do not make companion apps look
interchangeable: Askesis `#167A64`, Soma `#C4643C`, Oikonomia `#B9821F`, Hydros `#1F86CF`, Poreia `#4CC3C7`,
Praxis `#B3343F`, Theoria `#6A2C59`, Diaita `#3B3080`, Philia `#D8644F`, Ergon `#647F5C`, Therapeia `#4C6CC0`,
Dynamis `#DE762A`, Ktema `#7B5236`, and Phyton `#3A934B`. Proairetos keeps its user-selected room and lamp, with
`#C9A274` as its icon-inspired Amber identity. Each seed is contrast-adjusted by the scheme before it is used as an
accent, and the family label remains available for tonal and audit tooling.

Every app receives the same semantic roles: `--app-accent`, `--app-accent-hover`, `--app-accent-pressed`,
`--app-accent-soft`, `--app-accent-subtle`, `--app-on-accent`, surface, border, divider and text roles, plus
`--status-success`, `--status-warning`, `--status-error`, `--status-info` and `--status-neutral`. Status roles are
independent of the app signature. Photography, illustrations, charts, Nutri-Score bands, user-selected Proairetos
lamps, and the established always-dark Praxis and Theoria behavior are documented exceptions.
Legacy fallback values remain beside a few app declarations only for the first paint before Lamplight runs; their
runtime roles resolve through the shared semantic variables. They are not a second active palette.

## Color roles

| Role | Use |
| --- | --- |
| `--ll-wall` | side rail, deepest |
| `--ll-page` | the page |
| `--ll-card` | cards, grouped lists |
| `--ll-inset` | a card inside a card, fields |
| `--ll-raised` | menus, sheets |
| `--ll-ink`, `--ll-ink-2`, `--ll-ink-3` | text, secondary, faint |
| `--ll-hair` | the one hairline |
| `--ll-lamp` | links, where you are, focus (reads as text) |
| `--ll-lamp-fill`, `--ll-on-lamp` | the main action and the words on it |
| `--ll-lamp-soft`, `--ll-glow` | hover; soft tints |
| `--ll-remove` | removing something (never a failure color) |
| `--ll-smoke` | the room-colored dim behind a sheet or dialog |
| `--ll-bar` | translucent bars |

Plus `--ll-page-rgb`, `--ll-ink-rgb` and `--ll-lamp-rgb` for `rgba()` tints.

## Rooms and colors (Proairetos)

Settings › Appearance: Room (Hearth, Dusk, Harbor, Grove, Clay, Slate) and Color (Match, Amber, Ember, Rose, Heather,
Ink, Tide, Sage, Pewter, or Your own: any hue, `hue:N`), kept in `proairetos.appearance` (synced). The wallpaper
(`app/wallpaper.ts`) is drawn from the room's `art` colors: drawn like a system wallpaper (iOS, Material): soft
blooms of the room's colors, the lamp as a warm glow toward the upper right (no rings, no hard center), two silk folds
with light along their top edges and a soft shade beneath, and a fine grain so gradients never band. Today's foot is
two folds in the same colors fading into the page, with no sun of their own.

## The signature (1.6)

One lamp, one direction, one lit thing (`src/lamplight/brand.css`, imported after `material.css`):
- **Direction.** Every surface is lit from the upper right, where the wallpaper's lamp hangs: a warm sheen along its top
  and right edges (`--ll-sheen-edge`, `--ll-sheen-wash`) and its shade falling down and to the left (`--ll-cast`), together
  `--ll-surface-light` on cards, grouped lists and the shared lists; the main action catches it too. Each app's sheen is
  its own lamp's color, so the family shares the direction and differs in the light.
- **One lit thing.** Keyboard focus is the lamp turned on the control (`--ll-focus`: a warm halo and a soft outline; the
  plain ring stays under More contrast). On Today the next entry carries `--ll-halo` (`.ll-next`, from `DayTimeline`).
- **The light settles.** A tap that marks a check, tick or checkbox lights it (`[data-ll-settle]`, `ll-settle`, 1.1 s,
  set by `settleLight` in `behaviors.ts`) and the glow fades; a row that leaves at once carries it in its fading copy.
  Only on a tap that turns one on; never on loading; off with reduced motion.

## Tokens

- Shape: `--ll-radius-xs` 8, `-sm` 12, `-md` 16, `-lg` 22, `-pill` 999. Smaller nests inside larger.
- Space: `--ll-space-1` … `-8` (4, 8, 12, 16, 24, 32, 40, 48).
- Type: `--ll-type-display`, `-headline` (serif), `-title`, `-body`, `-label`, `-caption` (sans), on the
  family's type scale (`--text-xs` … `--text-4xl`).
- Light: `--ll-light-1` (a card), `-2` (a menu), `-3` (a sheet), `--ll-lamp-light` (the main action).
- Motion: `--ll-quick` 120, `--ll-calm` 240, `--ll-slow` 420, `--ll-dim` 640 ms; `--ll-ease-out`,
  `--ll-ease-in-out`, `--ll-ease-light`. Zero with reduced motion.
- States: `--ll-state-hover` (quiet ink layer), `--ll-state-pressed` (lamp layer), `--ll-state-selected` (the
  chosen place), `--ll-state-focus` (keyboard ring), `--ll-state-disabled` (quiet resting material), and
  `--ll-state-dragged` (held or moving item).
- Focus: `--ll-focus`, a ring made from `--ll-state-focus`.

Every interactive component follows the same contract: hover adds the quiet ink layer, pressing adds the lamp layer,
selection uses the chosen-place layer, and keyboard focus uses the lamp ring. A disabled control keeps its shape and
position while its material and content quiet down. Components expose their state through native controls or
`aria-pressed`, `aria-selected`, `aria-current`, and `aria-checked`; a new component should not invent a second state
color.

### Component matrix

| Component | Variants and sizes | State attributes | Minimum target |
| --- | --- | --- | --- |
| Button | primary, tonal, plain, remove; `--sm`, default, `--lg` | `disabled`, `aria-disabled`, `aria-busy` | 44px on touch |
| Field | `--sm`, default, `--lg` | `disabled`, `aria-disabled`, `aria-invalid` | 44px on touch |
| Chip | `--sm`, default, `--lg` | `aria-pressed`, `aria-checked`, `aria-disabled` | 44px on touch |
| Row | static or `ll-row--interactive` | `aria-disabled`; focus stays on the child control | 52px row |
| Menu item | standard 44px item | `aria-disabled`; keyboard focus remains visible | 44px |
| Bar item | current or quiet | `aria-current="page"`, `aria-disabled` | 44px |
| Switch | off or on | native `disabled`, `aria-checked`, `aria-disabled` | 44px hit area |

The compact size is a visual size for pointer and keyboard layouts; coarse pointers promote it to the 44px touch
target. A control that uses `aria-disabled="true"` remains discoverable to assistive technology and must also guard
its action in code; CSS only communicates the disabled state.

## Layout

`layout.css`: five patterns (home, list, detail, settings, sheet) on four numbers: `--ll-gutter` 20 (side margin),
`--ll-gap` 16 (within a section), `--ll-section-gap` 28 (between sections), `--ll-label-gap` 8 (a section's label to
what it labels). The family's own page classes (`.shell .page`, `.section-head`, `.app-shell__content`,
`.app-shell .page`, `.settings-group`) are put on this rhythm there; new screens use `.ll-page`, `.ll-section` and
`.ll-section-label` (a label outside its card, as Settings has it). Text is never under `--ll-text-min` 12 px, tab
labels never under `--ll-tab-min` 11 px. An empty list (`.list-empty`) is a lit mark, a sans title, one line and at
most one action, with no box.

## Between screens

`app/transitions.ts`: going forward from a tap on a card or row, the card tapped and the new page's head are both
named `ll-morph`, so the card grows into the page's title while the page pushes in (`motion.css`). The tab bar hands
the light off: the new picture lights in `--ll-quick` and the old dims over `--ll-slow`. Reduced motion skips both.

## Held motion and the large title

`behaviors.ts` (started once by `applyAppearance` in every app; `bars.css`): on phones one bar (`.ll-topbar`) runs
across the top of every page: the app's symbolic mark and name on the left (kept light over a home picture's shaded top), or a chevron with the back link's words; on the right the
page's header actions and the dock's `data-to-header` places (More or Settings, Apps, the way to Proairetos), copies
that press the originals, which leave the page and the dock. The app identity and actions stay in the bar while the
page title remains in the page; mobile title containers align to `--ll-title-anchor-top` before the handoff, then their
words blur away before any glyph is clipped while the solid room-tinted surface and hairline settle in. Welcome,
onboarding and full-screen moments have none. In an installed app a swipe from the left edge holds the page: it
follows the finger and finishes past a third of the width or on a flick, else springs back with a slight overshoot;
after it, only the new page's view transition plays (`data-swiped`). Sheets (`useSheet`) take a flick down, resist
upward, and let the room brighten as they are pulled (`--sheet-pull`). Version and changes: `version.ts`, shown on
the guide with States and Accessibility sections.

## Materials

After Fluent: **solid** for content (`--ll-material-solid`); **mica** for bars and docks (`--ll-material-mica`, opaque,
the room's hue a little stronger than the page, `--ll-material-mica-surface` adds the lamp washing in from above);
**smoke** (`--ll-material-smoke`), a plain room-colored dim, behind dialogs and sheets. The public classes
`.ll-material--wall`, `--page`, `--solid`, `--inset`, `--raised`, `--mica`, and `--smoke` let a new screen choose a
material without reaching into an app's private palette. The phone top bar is the one glass exception: once its title
has passed underneath, a soft room-tinted blur fades in as a solid bar over the page, with the page edge and a
semi-transparent hairline settling into it. No other surface uses `backdrop-filter`. Content passing under a dock
fades into it (`--ll-edge-below`, `--ll-edge-above`) rather than meeting a hard line.

## Touch and motion

Docks tuck away while reading down and return scrolling up (`ll-tucked`). Rows open a menu on a long press or right click,
read from their own buttons. Movement uses springs (`--ll-spring`, `--ll-spring-lively`, CSS `linear()`). Concentric
corners: what touches a container's edge takes its corner, what sits inset takes that corner less the inset
(`--ll-concentric`). One waiting mark, `Waiting`. Tablets get a floating dock; `forced-colors` and right to left are
handled.

## Scenes

Every drawn scene (`scripts/scenes/`) has one light at the same place across the picture (`LAMP_X` .64 in
`engine.mjs`), at its own horizon's height, with one faint ring (`lampRing`), as the wallpaper and the icons have. No
clouds, no second sun or moon.

## Icons

One drawing rule for every app: a 24 grid with a 2-unit margin, one 1.7 stroke, round ends and joins, corners
rounded about 2, nothing thinner than the stroke. Each icon has an inner shape that is hidden until the icon is
**lit**: the icon of the page you are on (or a pressed or chosen control, or `.ll-icon--lit`) fills softly with the
lamp from inside, at 24%. An icon with no inner shape of its own is lit by filling its own lines; glyphs whose lines
would fill badly (plus, chevrons, arrows) have an empty inner shape. The six icon modules (Proairetos, the newer
apps, Askesis, Soma, Oikonomia, Hydros) draw through `LampIcon`, so a change here reaches every app.

### Sizes, weight and marks

Icons come in seven sizes (`ICON_SIZES`: 16 in text, 18 in controls, 20 in rows, 22 in bars, 24 in tabs, 28 and 32
standing alone). `strokeFor(size)` keeps one optical weight, as SF Symbols does: about 1.5 px at 16, 1.66 at 24,
1.82 at 32. Small marks inside controls (close, back, chevron, plus, minus, check) are drawn with `Sym`, never typed
characters. `src/tests/lamplight/icons.test.ts` holds all three.

## The deep cut and Noesis

`makeScheme(room, lamp, 'dark', 'deep')` is the premium cut: a darker room with more distance between its layers
(wall .12, page .15, card .195, inset .235, raised .275 in OKLCH lightness), a finer hairline (6%) and a richer lamp,
held to the same contrast (tested for every room and lamp). Noesis (its own repository) carries a copy of
`src/lamplight/` and uses this cut, with a premium finish of its own (`noesis.css` there).

## Home Screen icons

`scripts/icons/` draws each app's tile lit by the lamp from the upper right, where the wallpaper keeps it: a warm
glow, one faint ring of its light, and the symbol's shadow falling down and to the left. Noesis's icon follows the
same rule. After changing icons, bump each worker's `CACHE`.

## 2.0, in preview

Shown on the guide (`#next`, `src/lamplight-guide/Preview.tsx`, `preview.css`). Day light is in every app (Settings >
Appearance > Light follows your day, in Proairetos); the rest is guide only so far.
Lamplight's own idea is light that means something, in place of borrowed surfaces:

- **Day light** (`src/lamplight/daylight.ts`): the lamp follows the person's day, waking to sleep (`dayPosition`, across
  midnight for night work), not the clock. Early it hangs high, cool and bright; late, low, warm and dimmer, with shade at
  the room's edges (`dayLight`). The lamp turns toward amber while keeping most of its own hue (`warmedLamp`); the pool is
  mixed straight between a cool white and the warmed lamp (`poolColor`). Text and surfaces keep the scheme's contrast.
- **Three levels of light**: at rest (no surface, in shade), near (a vellum surface) and lit (the one thing that matters
  now, with a halo of the pool). One lit thing per page; it moves to what is being typed in.
- **Vellum**: matte paper with a faint fiber, brightest at the lamp's corner (`VELLUM_LIFT`, the lit thing up to
  `LIT_STRENGTH` times), an edge of light on the lamp's side, a cast down-left. No glass, no outlines. `vellumReads` checks
  every text role on the brightest corner, in every room, mode and hour (tests in `src/tests/lamplight/daylight.test.ts`).
- **Motion as light**: a page brightens into place from the lamp; a tick lets the light settle, then the row goes into the
  shade with what is done (no line through it).
- **Your words lit**: the person's words in the serif and in the light; the app's labels in shade.
