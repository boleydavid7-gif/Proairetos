// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearUndo, offerUndo, say, UndoBar } from '../../lamplight/undo';

describe('the one undo bar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    act(() => {
      clearUndo();
      vi.advanceTimersByTime(1000);
    });
    cleanup();
    vi.useRealTimers();
  });

  it('offers one undo at a time, the newest replacing the last', () => {
    render(<UndoBar />);
    act(() => offerUndo('“Dishes” done', () => undefined));
    act(() => offerUndo('“Vacuum” done', () => undefined));
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status').textContent).toContain('Vacuum');
  });

  it('takes the change back once and goes away', () => {
    const run = vi.fn();
    render(<UndoBar />);
    act(() => offerUndo('“Stretch” deleted', run));
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(run).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('takes the change back on Ctrl+Z or ⌘Z, but leaves a field its own undo', () => {
    const run = vi.fn();
    render(
      <>
        <input aria-label="Name" />
        <UndoBar />
      </>,
    );
    act(() => offerUndo('“Stretch” deleted', run));
    fireEvent.keyDown(screen.getByLabelText('Name'), { key: 'z', ctrlKey: true });
    expect(run).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'z', metaKey: true });
    expect(run).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('leaves after seven seconds, fading for the last part', () => {
    render(<UndoBar />);
    act(() => offerUndo('“Stretch” deleted', () => undefined));
    act(() => vi.advanceTimersByTime(6900));
    expect(screen.getByRole('status').className).not.toContain('is-leaving');
    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByRole('status').className).toContain('is-leaving');
    act(() => vi.advanceTimersByTime(250));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('says a plain message for three seconds with nothing to undo', () => {
    render(<UndoBar />);
    act(() => say('Couldn’t save that. Try again.'));
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
    act(() => vi.advanceTimersByTime(3300));
    expect(screen.queryByRole('status')).toBeNull();
  });
});
