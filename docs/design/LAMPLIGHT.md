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
- Where you are: a soft amber-tinted pill behind the current tab or rail item, the icon in amber.
- Bars are translucent with a blur (the phone tab bar, sheet headers).
- The default wallpaper is a gradient (`--lamplight`); a chosen picture replaces it.
- Covers without a picture are typeset: title in serif, a short rule, the author, a steady hue from the title.
- Fields are filled (no border until focus); focus is an amber ring.
- Radii: 22 (heroes), 16 (cards), 12 (small pieces), 999 (pills).

## Dark

| Token | Value | Use |
| --- | --- | --- |
| `--lamp` | `#e6b366` | the main action, current place, focus (9.7:1 on the page) |
| `--lamp-soft` | `#f0d29c` | hover on the main action, text links |
| `--on-lamp` | `#1d1408` | text on the lamp (9.5:1) |
| `--paper` | `#f2ebdf` | text (15.7:1) |
| `--paper-2` | `#c4b9a9` | secondary text (9.1:1 on cards) |
| `--paper-3` | `#968c7e` | faint text (5.3:1 on cards) |
| `--tone-0` | `#0f0e0c` | sidebar, deepest |
| `--tone-1` | `#141311` | page |
| `--tone-2` | `#1b1916` | cards |
| `--tone-3` | `#23201c` | a card inside a card, hover |
| `--tone-4` | `#2c2823` | menus, popovers |
| `--hair` | `rgba(242, 235, 223, 0.07)` | the one hairline |

```css
--lamplight:
  radial-gradient(120% 80% at 18% 0%, rgba(230, 179, 102, 0.22), rgba(230, 179, 102, 0) 55%),
  radial-gradient(90% 70% at 100% 100%, rgba(120, 140, 170, 0.08), rgba(120, 140, 170, 0) 60%),
  linear-gradient(180deg, #1d1a16 0%, #141210 100%);
```

Phone bar: `--tone-1` at 72% with `blur(22px) saturate(1.4)`.

## Light

Warm paper in daylight, the lamp turned down to a deeper amber so it reads as text.

| Token | Value | Use |
| --- | --- | --- |
| `--lamp` | `#8f5f17` | links, current place icon, focus (4.9:1 on the page) |
| `--lamp-fill` | `#d9a352` | the main action's pill |
| `--on-lamp` | `#1d1408` | text on the pill (8.1:1) |
| `--paper` | `#231d15` | text (14.8:1) |
| `--paper-2` | `#5f5547` | secondary text (6.5:1) |
| `--paper-3` | `#73685a` | faint text (4.9:1) |
| `--tone-0` | `#efe8db` | sidebar |
| `--tone-1` | `#f6f1e7` | page |
| `--tone-2` | `#fffdf8` | cards (lighter than the page, as in Apple's grouped lists) |
| `--tone-3` | `#f1ebe0` | a card inside a card, hover |
| `--tone-4` | `#e9e1d3` | pressed, tonal buttons |
| `--hair` | `rgba(35, 29, 21, 0.08)` | the one hairline |

```css
--lamplight:
  radial-gradient(120% 80% at 18% 0%, rgba(230, 179, 102, 0.28), rgba(230, 179, 102, 0) 55%),
  radial-gradient(90% 70% at 100% 100%, rgba(120, 140, 170, 0.1), rgba(120, 140, 170, 0) 60%),
  linear-gradient(180deg, #fbf6ec 0%, #f1e9da 100%);
```

Phone bar: `#fffdf8` at 78% with the same blur, and a soft shadow (`0 8px 30px rgba(35, 29, 21, 0.1)`)
in place of dark mode's deeper one. The current-place pill is `rgba(217, 163, 82, 0.2)`.

## Staying changeable

Write rules against the tokens only. A person's chosen colors set the tokens:

- an accent sets `--lamp`, `--lamp-soft`, `--lamp-fill` and an `--lamp-rgb` triple used for every tint
  (`rgba(var(--lamp-rgb), 0.16)`);
- a background sets `--tone-1`, and the other tones are mixed from it
  (`color-mix(in oklab, var(--tone-1), #fff 4.5%)` for cards in dark; in light, cards toward `#fff` and the
  inner and pressed tones toward `#000`), as Noesis does;
- the wallpaper and the translucent bars are mixed from the tones too, so nothing stays amber or brown
  when another color is chosen.
