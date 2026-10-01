import {
  InvalidTransitionError,
  captureItem,
  changeStatus,
  editItem,
  scheduleItem,
  setCarried,
  setCheckBack,
  setImportant,
  setItemType,
} from '../../core/life-items/commands';
import { testContext } from '../support/testContext';

function captured() {
  const { context, advance } = testContext();
  const { item } = captureItem(context, { userId: 'u', title: '  Call the clinic  ' });
  return { context, advance, item };
}

describe('life item commands', () => {
  it('captures an unsorted open item and records its creation', () => {
    const { context } = testContext();
    const { item, events } = captureItem(context, { userId: 'u', title: '  Call the clinic  ' });

    expect(item).toMatchObject({ title: 'Call the clinic', type: null, status: 'OPEN', source: 'CAPTURE' });
    expect(events).toEqual([
      expect.objectContaining({ kind: 'CREATED', itemId: item.id, timestamp: item.createdAt }),
    ]);
  });

  it('refuses an empty capture', () => {
    const { context } = testContext();
    expect(() => captureItem(context, { userId: 'u', title: '   ' })).toThrow();
  });

  it('records type changes, and nothing when the type is unchanged', () => {
    const { context, item } = captured();
    const sorted = setItemType(context, item, 'DO');

    expect(sorted.item.type).toBe('DO');
    expect(sorted.events[0]).toMatchObject({ kind: 'TYPE_CHANGED', fromType: null, toType: 'DO' });
    expect(setItemType(context, sorted.item, 'DO').events).toEqual([]);
  });

  it('records each status change with the matching event', () => {
    const { context, advance, item } = captured();

    advance(1000);
    const waiting = changeStatus(context, item, 'WAITING', { checkBackAt: '2026-10-05' });
    expect(waiting.item).toMatchObject({ status: 'WAITING', checkBackAt: '2026-10-05' });
    expect(waiting.item.updatedAt).not.toBe(item.updatedAt);
    expect(waiting.events[0]).toMatchObject({ kind: 'WAITING_STARTED', fromStatus: 'OPEN', toStatus: 'WAITING' });

    const reopened = changeStatus(context, waiting.item, 'OPEN');
    expect(reopened.item.checkBackAt).toBeUndefined();
    expect(reopened.events[0].kind).toBe('WAITING_ENDED');

    const done = changeStatus(context, reopened.item, 'DONE');
    expect(done.events[0].kind).toBe('COMPLETED');

    expect(changeStatus(context, done.item, 'OPEN').events[0].kind).toBe('REOPENED');
    expect(changeStatus(context, item, 'LET_GO').events[0].kind).toBe('LET_GO');
  });

  it('blocks transitions the rules do not allow', () => {
    const { context, item } = captured();
    const done = changeStatus(context, item, 'DONE').item;

    expect(() => changeStatus(context, done, 'WAITING')).toThrow(InvalidTransitionError);
    expect(() => changeStatus(context, item, 'OPEN')).toThrow(InvalidTransitionError);
  });

  it('distinguishes scheduling from rescheduling', () => {
    const { context, item } = captured();
    const first = scheduleItem(context, item, '2026-10-02T09:00:00.000Z');
    const moved = scheduleItem(context, first.item, '2026-10-03T09:00:00.000Z');

    expect(first.events[0]).toMatchObject({ kind: 'SCHEDULED', toTime: '2026-10-02T09:00:00.000Z' });
    expect(moved.events[0]).toMatchObject({
      kind: 'RESCHEDULED',
      fromTime: '2026-10-02T09:00:00.000Z',
      toTime: '2026-10-03T09:00:00.000Z',
    });
    expect(scheduleItem(context, moved.item, '2026-10-03T09:00:00.000Z').events).toEqual([]);
  });

  it('records carrying, but keeps importance and edits out of history', () => {
    const { context, item } = captured();

    expect(setCarried(context, item, true).events[0].kind).toBe('CARRIED');
    expect(setCarried(context, { ...item, carried: true }, false).events[0].kind).toBe('UN_CARRIED');

    const important = setImportant(context, item, true);
    expect(important.item.important).toBe(true);
    expect(important.events).toEqual([]);

    expect(editItem(context, item, { notes: 'Ask about Friday' }).item.notes).toBe('Ask about Friday');
    expect(() => editItem(context, item, { title: ' ' })).toThrow();
  });

  it('never mutates the item it was given', () => {
    const { context, item } = captured();
    const before = structuredClone(item);
    changeStatus(context, item, 'DONE');
    setItemType(context, item, 'REMEMBER');
    expect(item).toEqual(before);
  });

  it('moves the check-back date only on waiting items, without logging it', () => {
    const { context, item } = captured();
    const waiting = changeStatus(context, item, 'WAITING', { checkBackAt: '2026-10-05' }).item;
    const moved = setCheckBack(context, waiting, '2026-10-08');

    expect(moved.item.checkBackAt).toBe('2026-10-08');
    expect(moved.events).toEqual([]);
    expect(() => setCheckBack(context, item, '2026-10-08')).toThrow();
  });
});
