// @vitest-environment jsdom
import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { setChildLimits, useListPermissions } from '../../app/family/sharedLists';
import SwipeRow from '../../oikonomia/app/SwipeRow';

afterEach(() => {
  setChildLimits({});
  cleanup();
});

describe('controls follow a child’s limits', () => {
  it('lets everyone do everything until a limit is set, then follows it as it changes', () => {
    const { result } = renderHook(() => useListPermissions('list-1'));
    expect(result.current).toEqual({ read: true, write: true, remove: true });
    act(() => setChildLimits({ 'list-1': 'view' }));
    expect(result.current).toEqual({ read: true, write: false, remove: false });
    act(() => setChildLimits({ 'list-1': 'add' }));
    expect(result.current).toEqual({ read: true, write: true, remove: false });
    act(() => setChildLimits({ 'other-list': 'view' }));
    expect(result.current.write).toBe(true);
  });

  it('keeps a bill row still when marking paid is not allowed', () => {
    const { rerender } = render(<SwipeRow label="Paid" onSwipe={() => undefined}><button type="button">Rent</button></SwipeRow>);
    expect(screen.getByRole('group', { name: /Paid/ })).toBeTruthy();
    rerender(<SwipeRow label="Paid" off onSwipe={() => undefined}><button type="button">Rent</button></SwipeRow>);
    expect(screen.queryByRole('group', { name: /Paid/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Rent' })).toBeTruthy();
  });
});
