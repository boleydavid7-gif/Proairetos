import {
  focusedMinutes,
  formatClockDown,
  isFinished,
  pause,
  remainingMs,
  resume,
  startSession,
} from '../../core/focus/session';

const MIN = 60_000;

describe('focus session', () => {
  it('counts down from timestamps, so reloads and sleep do not matter', () => {
    const session = startSession(0, 25, { id: 'i', title: 'Write report' });
    expect(remainingMs(session, 10 * MIN)).toBe(15 * MIN);
    expect(isFinished(session, 25 * MIN)).toBe(true);
    expect(remainingMs(session, 40 * MIN)).toBe(0);
  });

  it('stops the clock while paused', () => {
    let session = startSession(0, 10);
    session = pause(session, 4 * MIN);
    expect(remainingMs(session, 9 * MIN)).toBe(6 * MIN);
    session = resume(session, 9 * MIN);
    expect(remainingMs(session, 10 * MIN)).toBe(5 * MIN);
    expect(focusedMinutes(session, 10 * MIN)).toBe(5);
  });

  it('never reports more minutes than planned', () => {
    expect(focusedMinutes(startSession(0, 10), 60 * MIN)).toBe(10);
  });

  it('formats the countdown', () => {
    expect(formatClockDown(25 * MIN)).toBe('25:00');
    expect(formatClockDown(61_000)).toBe('1:01');
    expect(formatClockDown(500)).toBe('0:01');
  });
});
