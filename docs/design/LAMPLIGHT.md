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
| `src/lamplight/apps.ts` | Each app's theme (`appTheme`): a room and lamp from its page colors and accent |
| `src/lamplight/family.ts` | The bridge: each app's own color names set from the scheme (`familyVars`); `ALWAYS_DARK` (Praxis, Theoria) |
| `src/lamplight/tokens.css` | Shape, space, type roles, light (depth), motion, focus |
| `src/lamplight/components.css` | `.ll-button` (+ `--tonal`, `--plain`, `--remove`), `.ll-card`, `.ll-list`/`.ll-row`, `.ll-switch`, `.ll-field`, `.ll-chip`, `.ll-bar`, `.ll-sheet` |
| `src/lamplight/motion.css` | Press brightens and dims slowly; sheets dim the room |
| `src/lamplight/adopt.css` | The shared pieces the apps already use (`.card`, `.rows`, `.button-main`, `.button-accent`, `.button-quiet`, `.button-danger`, `.chip`, `.input`, `.field-input`, `.switch`, sheets) take shape, light, focus and tonal choices from the tokens, matching their `.ll-*` twins; layout untouched |
| `src/lamplight/icons.tsx`, `icons.css` | The family's line icons: `LampIcon` (24 grid, 1.7 stroke, round ends and joins), `GLYPHS` (the shared icons, drawn once), `glyphIcon(name, size)`, `lampIcon(line, lit)`; every app's icon module draws through it and re-exports the shared glyphs under its own names |
| `src/app/lamplight.ts` | `applyLamplight(appearance, light, app)`: sets the scheme on the root, Proairetos's wallpaper and foot |

Every app's `main` (or `startApp`) registers `withLamplight((look, light) => applyLamplight(look, light, app))`;
`premium.css` imports the three stylesheets, so every app has the tokens, components and motion. Tests:
`src/tests/lamplight/scheme.test.ts` (presets kept, every room × 32 lamps × dark/light readable, every app theme
readable).

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
| `--ll-bar` | translucent bars |

Plus `--ll-page-rgb`, `--ll-ink-rgb` and `--ll-lamp-rgb` for `rgba()` tints.

## Rooms and colors (Proairetos)

Settings › Appearance: Room (Hearth, Dusk, Harbor, Grove, Clay, Slate) and Color (Match, Amber, Ember, Rose, Heather,
Ink, Tide, Sage, Pewter, or Your own: any hue, `hue:N`), kept in `proairetos.appearance` (synced). The wallpaper
(`app/wallpaper.ts`) is drawn from the room's `art` colors: a lamp toward the upper right with rings of light and
three bands; Today's foot is three ridges in the same colors with no sun of their own.

## Tokens

- Shape: `--ll-radius-xs` 8, `-sm` 12, `-md` 16, `-lg` 22, `-pill` 999. Smaller nests inside larger.
- Space: `--ll-space-1` … `-8` (4, 8, 12, 16, 24, 32, 40, 48).
- Type: `--ll-type-display`, `-headline` (serif), `-title`, `-body`, `-label`, `-caption` (sans), on the
  family's type scale (`--text-xs` … `--text-4xl`).
- Light: `--ll-light-1` (a card), `-2` (a menu), `-3` (a sheet), `--ll-lamp-light` (the main action).
- Motion: `--ll-quick` 120, `--ll-calm` 240, `--ll-slow` 420, `--ll-dim` 640 ms; `--ll-ease-out`,
  `--ll-ease-in-out`, `--ll-ease-light`. Zero with reduced motion.
- Focus: `--ll-focus`, a ring of the lamp.

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
across the top of every page: the app's name on the left, or a chevron with the back link's words; on the right the
page's header actions and the dock's `data-to-header` places (More or Settings, Apps, the way to Proairetos), copies
that press the originals, which leave the page and the dock. It names the app only, takes glass when the page
scrolls and a hairline when the page's title has gone under; welcome, onboarding and full-screen moments have none. In an installed app a swipe from the left edge holds the page: it
follows the finger and finishes past a third of the width or on a flick, else springs back with a slight overshoot;
after it, only the new page's view transition plays (`data-swiped`). Sheets (`useSheet`) take a flick down, resist
upward, and let the room brighten as they are pulled (`--sheet-pull`). Version and changes: `version.ts`, shown on
the guide with States and Accessibility sections.

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

## The deep cut and Noesis

`makeScheme(room, lamp, 'dark', 'deep')` is the premium cut: a darker room with more distance between its layers
(wall .12, page .15, card .195, inset .235, raised .275 in OKLCH lightness), a finer hairline (6%) and a richer lamp,
held to the same contrast (tested for every room and lamp). Noesis (its own repository) carries a copy of
`src/lamplight/` and uses this cut, with a premium finish of its own (`noesis.css` there).

## Home Screen icons

`scripts/icons/` draws each app's tile lit by the lamp from the upper right, where the wallpaper keeps it: a warm
glow, one faint ring of its light, and the symbol's shadow falling down and to the left. Noesis's icon follows the
same rule. After changing icons, bump each worker's `CACHE`.
