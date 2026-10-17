import { describe, expect, it } from 'vitest';
import { contrast } from '../../lamplight/color';
import { LAMP_SEEDS, ROOM_SEEDS, makeScheme, ownLamp, schemeVars, type LampName, type Mode, type RoomName } from '../../lamplight/scheme';
import { THEMED_APPS, appTheme } from '../../lamplight/apps';

const rooms = Object.keys(ROOM_SEEDS) as RoomName[];
const lamps = Object.keys(LAMP_SEEDS) as LampName[];
const modes: Mode[] = ['dark', 'light'];

describe('Lamplight scheme', () => {
  // The presets, as the first palette made them (the scheme replaced that script and keeps its values).
  it('keeps the presets as they were made', () => {
    const d = makeScheme(ROOM_SEEDS.Hearth, LAMP_SEEDS.Amber, 'dark');
    expect([d.page, d.card, d.ink, d.lamp, d.onLamp]).toEqual(['#14100b', '#1d1914', '#f4ede6', '#ebb25f', '#211300']);
    const l = makeScheme(ROOM_SEEDS.Hearth, LAMP_SEEDS.Amber, 'light');
    expect([l.page, l.card, l.lamp, l.lampFill]).toEqual(['#fcf2e7', '#fefcfa', '#895c05', '#e6ab52']);
    expect(makeScheme(ROOM_SEEDS.Harbor, LAMP_SEEDS.Ink, 'dark').page).toBe('#07111d');
  });

  it('exposes the semantic surface roles used by shared components', () => {
    const s = makeScheme(ROOM_SEEDS.Hearth, LAMP_SEEDS.Amber, 'dark');
    const vars = schemeVars(s);
    expect(vars['--ll-surface-container-lowest']).toBe(s.wall);
    expect(vars['--ll-surface-container-low']).toBe(s.page);
    expect(vars['--ll-surface-container']).toBe(s.card);
    expect(vars['--ll-surface-container-high']).toBe(s.inset);
    expect(vars['--ll-surface-container-highest']).toBe(s.raised);
    expect(vars['--ll-on-surface']).toBe(s.ink);
    expect(vars['--ll-on-surface-variant']).toBe(s.ink2);
    expect(vars['--ll-outline-variant']).toBe(s.hair);
  });

  // Every preset, and a lamp of the person's own at every 15 degrees: what is read passes on every surface.
  const seeds = [...lamps.map((name) => [name, LAMP_SEEDS[name]] as const), ...Array.from({ length: 24 }, (_, i) => [`hue ${i * 15}`, ownLamp(i * 15)] as const)];
  it.each(rooms)('reads in %s, every lamp, dark and light', (room) => {
    for (const [name, lamp] of seeds)
      for (const mode of modes) {
        const s = makeScheme(ROOM_SEEDS[room], lamp, mode);
        const where = `${room} ${name} ${mode}`;
        for (const bg of [s.page, s.card, s.inset]) {
          expect(contrast(s.ink, bg), where).toBeGreaterThanOrEqual(7);
          for (const fg of [s.ink2, s.ink3, s.lamp, s.remove]) expect(contrast(fg, bg), where).toBeGreaterThanOrEqual(4.5);
        }
        expect(contrast(s.onLamp, s.lampFill), where).toBeGreaterThanOrEqual(4.5);
      }
  });

  it.each(THEMED_APPS)('keeps %s in its own theme, readable dark and light', (app) => {
    const theme = appTheme(app)!;
    for (const mode of modes) {
      const s = makeScheme(theme.room, theme.lamp, mode);
      for (const bg of [s.page, s.card, s.inset]) {
        expect(contrast(s.ink, bg), `${app} ${mode}`).toBeGreaterThanOrEqual(7);
        for (const fg of [s.ink2, s.ink3, s.lamp, s.remove]) expect(contrast(fg, bg), `${app} ${mode}`).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrast(s.onLamp, s.lampFill)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps the deep (premium) cut readable in every room and lamp', () => {
    for (const room of rooms)
      for (const [name, lamp] of seeds) {
        const s = makeScheme(ROOM_SEEDS[room], lamp, 'dark', 'deep');
        for (const bg of [s.page, s.card, s.inset]) {
          expect(contrast(s.ink, bg), `${room} ${name}`).toBeGreaterThanOrEqual(7);
          for (const fg of [s.ink2, s.ink3, s.lamp, s.remove]) expect(contrast(fg, bg), `${room} ${name}`).toBeGreaterThanOrEqual(4.5);
        }
        expect(contrast(s.onLamp, s.lampFill)).toBeGreaterThanOrEqual(4.5);
      }
  });
});
