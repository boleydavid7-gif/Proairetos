import { describe, expect, it } from 'vitest';
import { TODAY_SECTIONS, isUsualOrder, moveSection, placeSection, readLayout } from '../../core/today/layout';

describe('Today layout', () => {
  it('starts in the usual order with nothing off', () => {
    const layout = readLayout(null);
    expect(layout.order).toEqual([...TODAY_SECTIONS]);
    expect(layout.off).toEqual([]);
    expect(isUsualOrder(layout)).toBe(true);
  });

  it('keeps a stored order, drops unknown names and doubles, and slots new sections in after their usual neighbor', () => {
    const layout = readLayout({ order: ['apps', 'day', 'apps', 'gone'], off: ['day', 'line', 'nope'] });
    expect(layout.order.indexOf('apps')).toBeLessThan(layout.order.indexOf('day'));
    expect(new Set(layout.order).size).toBe(TODAY_SECTIONS.length);
    // 'next' usually follows 'together', which follows 'intention'; none were stored, so they lead.
    expect(layout.order.indexOf('next')).toBeLessThan(layout.order.indexOf('apps'));
    // Sections with a What's included part are switched there, never by this list.
    expect(layout.off).toEqual(['day']);
  });

  it('moves a section one place and leaves the ends alone', () => {
    const start = readLayout(null);
    expect(moveSection(start, 'intention', -1)).toBe(start);
    const down = moveSection(start, 'intention', 1);
    expect(down.order.slice(0, 2)).toEqual(['together', 'intention']);
    expect(moveSection(start, 'line', 1)).toBe(start);
  });

  it('places a dragged section at a new position', () => {
    const layout = placeSection(readLayout(null), 'line', 0);
    expect(layout.order[0]).toBe('line');
    expect(layout.order).toHaveLength(TODAY_SECTIONS.length);
    expect(isUsualOrder(layout)).toBe(false);
  });
});
