// Small per-device flags. Storage can be blocked (private mode), so every access is guarded.
const ONBOARDED_KEY = 'proairetos.onboarded';

export function hasOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === 'yes';
  } catch {
    return false;
  }
}

export function markOnboarded(): void {
  try {
    localStorage.setItem(ONBOARDED_KEY, 'yes');
  } catch {
    // Onboarding will show again next visit; nothing else depends on this.
  }
}

const LOOK_AHEAD_KEY = 'proairetos.lookAheadSetAside';

function localDayKey(day: Date): string {
  return `${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`;
}

/** True when the person set the look-ahead aside earlier on this local day. */
export function isLookAheadSetAside(today: Date = new Date()): boolean {
  try {
    return localStorage.getItem(LOOK_AHEAD_KEY) === localDayKey(today);
  } catch {
    return false;
  }
}

export function setLookAheadAside(today: Date = new Date()): void {
  try {
    localStorage.setItem(LOOK_AHEAD_KEY, localDayKey(today));
  } catch {
    // It will show again on the next visit today; harmless.
  }
}
