import { describe, expect, it } from 'vitest';
import { backupText, packBackup } from '../../data/backup/packing';

describe('backup files', () => {
  it('compresses and reads back the same text, much smaller', async () => {
    const text = JSON.stringify({ format: 'proairetos-backup', items: Array.from({ length: 400 }, (_, i) => ({ id: i, title: `Item ${i}`, note: 'The same words again' })) });
    const { blob, extension } = await packBackup(text);
    expect(extension).toBe('json.gz');
    expect(blob.size).toBeLessThan(text.length / 4);
    expect(await backupText(blob)).toBe(text);
  });

  it('still reads a plain backup', async () => {
    expect(await backupText(new Blob(['{"format":"proairetos-backup"}']))).toBe('{"format":"proairetos-backup"}');
  });
});
