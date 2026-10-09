// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { lock, validCode } from '../../app/lock/lock';
import { keptInBackup } from '../../data/backup/family';

describe('the passcode lock', () => {
  beforeEach(() => {
    lock.turnOff();
  });

  it('is off until chosen, and a new code leaves the person in', async () => {
    expect(lock.isOn()).toBe(false);
    expect(lock.isLocked()).toBe(false);
    await lock.turnOn('4821');
    expect(lock.isOn()).toBe(true);
    expect(lock.isLocked()).toBe(false);
  });

  it('locks, refuses a wrong code and opens with the right one', async () => {
    await lock.turnOn('4821');
    lock.lockNow();
    expect(lock.isLocked()).toBe(true);
    expect(await lock.unlock('1111')).toBe(false);
    expect(lock.isLocked()).toBe(true);
    expect(await lock.unlock('4821')).toBe(true);
    expect(lock.isLocked()).toBe(false);
  });

  it('never stores the code itself, and keeps it out of backups and sync', async () => {
    await lock.turnOn('4821');
    expect(localStorage.getItem('proairetos.lock')).not.toContain('4821');
    expect(keptInBackup('proairetos.lock')).toBe(false);
  });

  it('turning it off removes the lock', async () => {
    await lock.turnOn('4821');
    lock.lockNow();
    lock.turnOff();
    expect(lock.isOn()).toBe(false);
    expect(lock.isLocked()).toBe(false);
  });

  it('takes 4 to 8 digits', () => {
    expect(validCode('123')).toBe(false);
    expect(validCode('1234')).toBe(true);
    expect(validCode('12345678')).toBe(true);
    expect(validCode('123456789')).toBe(false);
    expect(validCode('12a4')).toBe(false);
  });
});
