# Lamplight

A look kept for Proairetos, and later the family: Apple's calm and depth (translucent bars, large titles,
space instead of lines) with Material 3's structure (tonal surfaces in steps, pill controls, a clear marker
for where you are), in a warm key: ink and paper, lit by one amber lamp, the way a book is read at night.
Noesis uses the same structure in night blue and gold (`noesis/src/design.css`); copy that file's rules and
swap in these tokens.

Not applied yet. When it is, it sits on top of the existing light and dark themes (`data-theme`) and the
person's chosen colors still win: every color below is a token, never a fixed value in a rule.

## Principles

- Surfaces, not outlines. Cards are a step lighter (dark) or whiter (light) than the page; a hairline at most.
  Never a box drawn around a box.
- One lit action per screen: the amber pill. Everything else is a tonal pill or plain text.
- Where you are: a soft amber-tinted pill under the current tab or rail item, the icon in amber.
- Bars are translucent with a blur (the phone tab bar, sheet headers).
- The default wallpaper is a gradient (`--lamplight`); a chosen picture replaces it.
- Covers without a picture are typeset: title in serif, a short rule, the author, a steady hue from the title.
- Fields are filled (no border until focus); focus is an amber ring.
- Radii: 22 (heroes), 16 (cards), 12 (small pieces), 999 (pills).

## Dark

| Token         | Value                       | Use                                                       |
| ------------- | --------------------------- | --------------------------------------------------------- |
| `--lamp`      | `#e6b366`                   | the main action, current place, focus (9.7:1 on the page) |
| `--lamp-soft` | `#f0d29c`                   | hover on the main action, text links                      |
| `--on-lamp`   | `#1d1408`                   | text on the lamp (9.5:1)                                  |
| `--paper`     | `#f2ebdf`                   | text (15.7:1)                                             |
| `--paper-2`   | `#c4b9a9`                   | secondary text (9.1:1 on cards)                           |
| `--paper-3`   | `#968c7e`                   | faint text (5.3:1 on cards)                               |
| `--tone-0`    | `#0f0e0c`                   | sidebar, deepest                                          |
| `--tone-1`    | `#141311`                   | page                                                      |
| `--tone-2`    | `#1b1916`                   | cards                                                     |
| `--tone-3`    | `#23201c`                   | a card inside a card, hover                               |
| `--tone-4`    | `#2c2823`                   | menus, popovers                                           |
| `--hair`      | `rgba(242, 235, 223, 0.07)` | the one hairline                                          |

```css
--lamplight:
  radial-gradient(
    120% 80% at 18% 0%,
    rgba(230, 179, 102, 0.22),
    rgba(230, 179, 102, 0) 55%
  ),
  radial-gradient(
    90% 70% at 100% 100%,
    rgba(120, 140, 170, 0.08),
    rgba(120, 140, 170, 0) 60%
  ),
  linear-gradient(180deg, #1d1a16 0%, #141210 100%);
```

Phone bar: `--tone-1` at 72% with `blur(22px) saturate(1.4)`.

## Light

Warm paper in daylight, the lamp turned down to a deeper amber so it reads as text.

| Token         | Value                    | Use                                                        |
| ------------- | ------------------------ | ---------------------------------------------------------- |
| `--lamp`      | `#8f5f17`                | links, current place icon, focus (4.9:1 on the page)       |
| `--lamp-fill` | `#d9a352`                | the main action's pill                                     |
| `--on-lamp`   | `#1d1408`                | text on the pill (8.1:1)                                   |
| `--paper`     | `#231d15`                | text (14.8:1)                                              |
| `--paper-2`   | `#5f5547`                | secondary text (6.5:1)                                     |
| `--paper-3`   | `#73685a`                | faint text (4.9:1)                                         |
| `--tone-0`    | `#efe8db`                | sidebar                                                    |
| `--tone-1`    | `#f6f1e7`                | page                                                       |
| `--tone-2`    | `#fffdf8`                | cards (lighter than the page, as in Apple's grouped lists) |
| `--tone-3`    | `#f1ebe0`                | a card inside a card, hover                                |
| `--tone-4`    | `#e9e1d3`                | pressed, tonal buttons                                     |
| `--hair`      | `rgba(35, 29, 21, 0.08)` | the one hairline                                           |

```css
--lamplight:
  radial-gradient(
    120% 80% at 18% 0%,
    rgba(230, 179, 102, 0.28),
    rgba(230, 179, 102, 0) 55%
  ),
  radial-gradient(
    90% 70% at 100% 100%,
    rgba(120, 140, 170, 0.1),
    rgba(120, 140, 170, 0) 60%
  ),
  linear-gradient(180deg, #fbf6ec 0%, #f1e9da 100%);
```

Phone bar: `#fffdf8` at 78% with the same blur, and a soft shadow (`0 8px 30px rgba(35, 29, 21, 0.1)`)
in place of dark mode's deeper one. The current-place pill is `rgba(217, 163, 82, 0.2)`.

## Rooms and colors

Apple offers a few named accent colors and wallpapers; Google's Material You takes a whole palette from the
wallpaper. Lamplight does both, in its own way: the person picks a **room** (the wallpaper and the hue every
surface takes from it, like Material You) and a **color** (the lamp: the one main action, the current place,
links), each in dark and light. A color can be left on **Match**, which takes the one the room was made with.

Every value is made in OKLCH by `scripts/design/lamplight-palette.py` and checked there: text 7:1, secondary
and faint text and the lamp 4.5:1 on every surface (page, card, inner card) in every room, and text on the
pill 4.5:1. All values are in `docs/design/lamplight-tokens.json`; `docs/design/lamplight-preview.html`
shows them on Today.

### Rooms

The wallpaper is three soft glows in the room's colors over a gradient that settles into the page, so cards
read the same in every room. Tones: page `tone1`, sidebar `tone0`, cards `tone2`, inner cards `tone3`,
menus `tone4`; text `paper`, `paper2`, `paper3`; one hairline `hair`.

| Room   | Dark                                            | Light                      | Matched color | Page (dark / light)   |
| ------ | ----------------------------------------------- | -------------------------- | ------------- | --------------------- |
| Hearth | Warm ink by the fire, amber light from the top  | Cream paper in morning sun | Amber         | `#14100b` / `#fcf2e7` |
| Dusk   | Plum dark, a rose and amber sky low on the left | Soft pink morning          | Rose          | `#160d15` / `#faf0f9` |
| Harbor | Deep sea blue with one lamp in a window         | Sea air, pale blue         | Amber         | `#07111d` / `#edf4fd` |
| Grove  | Evening green, gold light through leaves        | Green shade, bright day    | Sage          | `#08130d` / `#ebf7ef` |
| Clay   | Baked earth, ember glow                         | Sunlit plaster             | Ember         | `#1b0c06` / `#fff0ea` |
| Slate  | Quiet graphite, the faintest warmth             | Cool paper, overcast       | Pewter        | `#0e1114` / `#f1f4f7` |

### Colors

Dark uses `lamp` for the pill, links and the current place. Light uses the deeper `lamp` for links and the
current place (it reads as text) and `fill` for the pill. Text on the pill is `on` in both.

| Color   | Dark `lamp` | Light `lamp` | Light `fill` |
| ------- | ----------- | ------------ | ------------ |
| Amber   | `#ebb25f`   | `#895c05`    | `#e6ab52`    |
| Ember   | `#ffa47a`   | `#a84811`    | `#ff996a`    |
| Rose    | `#fba0b0`   | `#9d4b5d`    | `#f797a9`    |
| Heather | `#d8abe2`   | `#7e5688`    | `#d3a4dd`    |
| Ink     | `#9bbeff`   | `#46659f`    | `#93b8fb`    |
| Tide    | `#71cfd9`   | `#026f78`    | `#65c9d4`    |
| Sage    | `#9ccd9c`   | `#427044`    | `#93c794`    |
| Pewter  | `#c5bcb1`   | `#6b635a`    | `#bfb6aa`    |

## Staying changeable

Write rules against the tokens only. A person's chosen colors set the tokens:

- an accent sets `--lamp`, `--lamp-soft`, `--lamp-fill` and an `--lamp-rgb` triple used for every tint
  (`rgba(var(--lamp-rgb), 0.16)`);
- a background sets `--tone-1`, and the other tones are mixed from it
  (`color-mix(in oklab, var(--tone-1), #fff 4.5%)` for cards in dark; in light, cards toward `#fff` and the
  inner and pressed tones toward `#000`), as Noesis does;
- the wallpaper and the translucent bars are mixed from the tones too, so nothing stays amber or brown
  when another color is chosen.
