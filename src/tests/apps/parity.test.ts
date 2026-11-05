import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APPS } from '../../core/apps';
import { ADD_ONS, NOT_OFFERED } from '../../app/family/added';
import { CORE_APPS } from '../../app/family/purchases';
import { REMINDER_SOURCES, appAt, appFromOpen, appNameForOpen, sourceOf, sourcesToWrite } from '../../core/notify/sources';
import { DAILY_PRACTICE_APPS, WORTH_ATTENTION_APPS } from '../../core/today/apps';
import { PART_APP } from '../../app/hooks/useTodayParts';
import { keptInBackup } from '../../data/backup/family';

/*
 * Wave 1 moved the plain id lists to read the manifest. These tests hold what they produce to the lists that were
 * written out by hand before (the frozen literals below), so a change to the manifest that alters behavior shows here.
 */
const same = (a: readonly string[], b: readonly string[]) => expect([...a].sort()).toEqual([...b].sort());
const ALL = ['askesis', 'soma', 'oikonomia', 'hydros', 'poreia', 'praxis', 'theoria', 'diaita', 'philia', 'ergon', 'therapeia', 'dynamis', 'ktema', 'phyton', 'mneme', 'melete'];

describe('what reads the manifest', () => {
  it('ADD_ONS and NOT_OFFERED', () => {
    same(ADD_ONS, ALL);
    same([...NOT_OFFERED], ['praxis']);
  });
  it('CORE_APPS', () => {
    same(CORE_APPS, ['askesis', 'soma', 'oikonomia', 'poreia', 'theoria', 'diaita', 'philia', 'ergon', 'therapeia', 'dynamis', 'ktema', 'phyton', 'mneme', 'melete']);
  });
  it('the backup prefixes', () => {
    for (const app of ALL.filter((id) => id !== 'praxis')) expect(keptInBackup(`${app}:x`), app).toBe(true);
    expect(keptInBackup('proairetos.setting')).toBe(true);
    expect(keptInBackup('proairetos.auth')).toBe(false);
    expect(keptInBackup('other:x')).toBe(false);
  });
  it('the apps sync knows by name', () => {
    const text = readFileSync('src/data/sync/supabase.ts', 'utf8');
    expect(text).toContain("APPS.filter((app) => app.status !== 'main')");
  });
  it('REMINDER_SOURCES', () => {
    same(REMINDER_SOURCES, ['proairetos', 'askesis', 'oikonomia', 'hydros', 'poreia', 'praxis', 'diaita', 'philia', 'ergon', 'therapeia', 'dynamis', 'ktema', 'phyton', 'melete']);
  });
  it('notice kinds map to their sources', () => {
    const expected: Record<string, string> = { run: 'askesis', bill: 'oikonomia', hydration: 'hydros', study: 'praxis', rhythm: 'diaita', person: 'philia', chore: 'ergon', dose: 'therapeia', care: 'therapeia', training: 'dynamis', upkeep: 'ktema', plant: 'phyton', trip: 'poreia', melete: 'melete', other: 'proairetos' };
    for (const [kind, source] of Object.entries(expected)) expect(sourceOf({ kind } as never), kind).toBe(source);
  });
  it('app names, addresses and who writes what', () => {
    expect(appNameForOpen('praxis:x')).toBe('Theoria');
    expect(appNameForOpen('melete:subject:1')).toBe('Meletē');
    expect(appNameForOpen('day:today')).toBe('Proairetos');
    expect(appFromOpen('therapeia')).toBe('therapeia');
    expect(appAt('/soma/')).toBe('soma');
    expect(appAt('/nowhere/')).toBe('proairetos');
    expect(sourcesToWrite('soma', [])).toEqual([]);
    expect(sourcesToWrite('theoria', [])).toEqual([]);
    expect(sourcesToWrite('mneme', [])).toEqual([]);
    expect(sourcesToWrite('praxis', [])).toEqual(['praxis']);
    same(sourcesToWrite('proairetos', [], ['askesis', 'oikonomia', 'hydros', 'diaita', 'philia', 'ergon', 'therapeia', 'dynamis', 'ktema', 'phyton', 'poreia', 'melete']), ['proairetos', 'askesis', 'oikonomia', 'hydros', 'diaita', 'philia', 'ergon', 'therapeia', 'dynamis', 'ktema', 'phyton', 'poreia', 'melete']);
    expect(sourcesToWrite('proairetos', [], ['praxis'])).toEqual(['proairetos']);
  });
  it('Today groups keep their order', () => {
    expect([...DAILY_PRACTICE_APPS]).toEqual(['hydros', 'askesis', 'dynamis', 'diaita', 'theoria', 'melete']);
    expect([...WORTH_ATTENTION_APPS]).toEqual(['ergon', 'ktema', 'oikonomia', 'philia', 'phyton', 'poreia', 'soma', 'therapeia']);
  });
  it('Today parts', () => {
    expect(PART_APP).toEqual({
      askesis: 'askesis', soma: 'soma', bills: 'oikonomia', 'bill-dates': 'oikonomia', water: 'hydros', praxis: 'praxis', highlight: 'theoria', diaita: 'diaita',
      birthdays: 'philia', 'birthday-dates': 'philia', chores: 'ergon', medicines: 'therapeia', training: 'dynamis', upkeep: 'ktema', plants: 'phyton',
      trips: 'poreia', mneme: 'mneme', 'study-dates': 'melete', 'ktema-dates': 'ktema',
    });
  });
  it('the Vite entry points', () => {
    const text = readFileSync('vite.config.ts', 'utf8');
    expect(text).toContain("app.urls.entry");
    for (const app of APPS) expect(app.urls.entry, app.id).toMatch(/index\.html$/);
  });
});
