import { describe, expect, it } from 'vitest';
import { readHiddenTodayApps, DAILY_PRACTICE_APPS, WORTH_ATTENTION_APPS } from '../../core/today/apps';

describe('Today app summaries', () => {
  it('starts with the intended two app groups', () => {
    expect(DAILY_PRACTICE_APPS).toEqual(['hydros', 'askesis', 'dynamis', 'diaita', 'theoria']);
    expect(WORTH_ATTENTION_APPS).toEqual(['ergon', 'ktema', 'oikonomia', 'philia', 'phyton', 'poreia', 'soma', 'therapeia']);
  });

  it('keeps valid hidden apps once and ignores retired or unknown entries', () => {
    expect(readHiddenTodayApps(['hydros', 'hydros', 'praxis', 'mneme', 'unknown', 'therapeia'])).toEqual(['hydros', 'therapeia']);
  });

  it('treats an invalid saved value as no hidden apps', () => {
    expect(readHiddenTodayApps(null)).toEqual([]);
    expect(readHiddenTodayApps('hydros')).toEqual([]);
  });
});
