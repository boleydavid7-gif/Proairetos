import { describe, expect, it } from 'vitest';
import { shortcutFor } from '../../app/shortcuts';

const press = (key: string, extra: Record<string, unknown> = {}) =>
  ({ key, ctrlKey: false, metaKey: false, altKey: false, target: null, ...extra }) as Parameters<typeof shortcutFor>[0];

describe('keyboard shortcuts', () => {
  it('numbers jump between the five main pages', () => {
    expect(shortcutFor(press('1'))).toEqual({ go: 'today' });
    expect(shortcutFor(press('3'))).toEqual({ go: 'plan' });
    expect(shortcutFor(press('5'))).toEqual({ go: 'compass' });
    expect(shortcutFor(press('6'))).toBeUndefined();
    expect(shortcutFor(press('0'))).toBeUndefined();
  });

  it('slash opens search', () => {
    expect(shortcutFor(press('/'))).toEqual({ search: true });
  });

  it('stays out of the way while typing, in a dialog, or with a modifier held', () => {
    expect(shortcutFor(press('1', { target: { tagName: 'INPUT' } }))).toBeUndefined();
    expect(shortcutFor(press('/', { target: { tagName: 'TEXTAREA' } }))).toBeUndefined();
    expect(shortcutFor(press('1', { target: { tagName: 'DIV', isContentEditable: true } }))).toBeUndefined();
    expect(shortcutFor(press('1'), true)).toBeUndefined();
    expect(shortcutFor(press('1', { metaKey: true }))).toBeUndefined();
    expect(shortcutFor(press('1', { ctrlKey: true }))).toBeUndefined();
  });
});
