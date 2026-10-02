import { IDBFactory } from 'fake-indexeddb';
import { BackupError } from '../../data/backup/format';
import {
  createIndexedDbCompassStatementRepository,
  createIndexedDbAttachmentRepository,
  createIndexedDbDecisionRepository,
  createIndexedDbItemEventRepository,
  createIndexedDbLifeItemRepository,
  createIndexedDbReflectionRepository,
  createIndexedDbScheduleExceptionRepository,
  createIndexedDbSchedulePatternRepository,
  createIndexedDbValueRepository,
} from '../../data/repositories/indexeddb/indexedDbRepositories';
import { openDatabase } from '../../data/storage/indexeddb/database';
import type { Repositories } from '../../data/storage/deviceStorage';
import { createBackupService } from '../../services/backup/backupService';
import { createAttachmentService } from '../../services/attachments/attachmentService';
import { createCompassService } from '../../services/compass/compassService';
import { createDecisionService } from '../../services/decisions/decisionService';
import { createLifeService } from '../../services/life/lifeService';
import { createReflectionService } from '../../services/reflection/reflectionService';
import { createScheduleService } from '../../services/schedule/scheduleService';
import { testContext } from '../support/testContext';

function device(userId = 'local') {
  const db = openDatabase(new IDBFactory());
  const repositories: Repositories = {
    items: createIndexedDbLifeItemRepository(db),
    events: createIndexedDbItemEventRepository(db),
    reflections: createIndexedDbReflectionRepository(db),
    values: createIndexedDbValueRepository(db),
    statements: createIndexedDbCompassStatementRepository(db),
    schedulePatterns: createIndexedDbSchedulePatternRepository(db),
    scheduleExceptions: createIndexedDbScheduleExceptionRepository(db),
    decisions: createIndexedDbDecisionRepository(db),
    attachments: createIndexedDbAttachmentRepository(db),
  };
  const { context } = testContext();
  return {
    backup: createBackupService({ userId, context, repositories }),
    life: createLifeService({ userId, context, items: repositories.items, events: repositories.events }),
    compass: createCompassService({ userId, context, values: repositories.values, statements: repositories.statements }),
    reflections: createReflectionService({ userId, context, reflections: repositories.reflections }),
    schedule: createScheduleService({ userId, context, patterns: repositories.schedulePatterns, exceptions: repositories.scheduleExceptions }),
    decisions: createDecisionService({ userId, context, decisions: repositories.decisions }),
    attachments: createAttachmentService({ userId, context, attachments: repositories.attachments }),
  };
}

async function fill(d: ReturnType<typeof device>) {
  const item = await d.life.capture('Call the clinic');
  await d.life.sort(item.id, 'DO');
  await d.compass.chooseValue('Courage');
  await d.compass.writeStatement('REMEMBER', 'People over plans');
  await d.reflections.write({ body: 'Quiet morning.' });
  const pattern = await d.schedule.createPattern({
    name: 'Work', kind: 'COMMITTED', layout: 'CYCLE', anchorDate: '2026-09-29', segments: [{ days: 1, blocks: [] }],
  });
  await d.schedule.changeDay(pattern.id, '2026-10-01', []);
  await d.decisions.decide({ question: 'Teams', options: ['Stay'], choice: 'Stay' });
  await d.attachments.add(item.id, { name: 'receipt.jpg', type: 'image/jpeg', data: new Uint8Array([255, 216, 0, 1, 2, 3]).buffer });
}

describe('backup', () => {
  it('round-trips everything to a new device', async () => {
    const from = device();
    await fill(from);
    const text = await from.backup.exportFile();

    const to = device();
    const { data } = await to.backup.readFile(text);
    await to.backup.replaceAll(data);

    expect(await to.backup.exportData()).toEqual(await from.backup.exportData());
    expect((await to.backup.exportData()).attachments?.[0]).toMatchObject({ name: 'receipt.jpg', data: btoa(String.fromCharCode(255, 216, 0, 1, 2, 3)) });
  });

  it('seals a backup with a password and refuses the wrong one', async () => {
    const from = device();
    await fill(from);
    const text = await from.backup.exportFile('correct horse');

    expect(text).not.toContain('Call the clinic');
    await expect(from.backup.readFile(text)).rejects.toThrow('locked');
    await expect(from.backup.readFile(text, 'wrong')).rejects.toThrow('That password does not open this backup.');
    const { data } = await from.backup.readFile(text, 'correct horse');
    expect(data.lifeItems[0].title).toBe('Call the clinic');
  }, 20_000);

  it('rejects files that are not backups, damaged, or from a newer version', async () => {
    const { backup } = device();
    await expect(backup.readFile('not json')).rejects.toBeInstanceOf(BackupError);
    await expect(backup.readFile('{"format":"other"}')).rejects.toThrow('not a Proairetos backup');
    await expect(backup.readFile('{"format":"proairetos-backup","version":99}')).rejects.toThrow('newer version');
    const damaged = JSON.stringify({ format: 'proairetos-backup', version: 1, encrypted: false, data: { lifeItems: [{}] } });
    await expect(backup.readFile(damaged)).rejects.toBeInstanceOf(BackupError);
  });

  it('replaces what was there, and claims records for this person', async () => {
    const other = device('someone-else');
    await other.life.capture('From another account');
    const text = await other.backup.exportFile();

    const here = device();
    await here.life.capture('Already here');
    await here.backup.replaceAll((await here.backup.readFile(text)).data);
    expect((await here.life.list()).map((i) => i.title)).toEqual(['From another account']);
  });

  it('deletes everything', async () => {
    const d = device();
    await fill(d);
    await d.backup.deleteAll();
    const empty = await d.backup.exportData();
    expect(Object.values(empty).every((list) => list.length === 0)).toBe(true);
  });
});
