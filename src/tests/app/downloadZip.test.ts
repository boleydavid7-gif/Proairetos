import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { readArchiveJson, readZip } from '../../app/family/downloadZip';

describe('device archive helper', () => {
  it('opens a manifest and a binary entry', async () => {
    const archive = zipSync({ 'manifest.json': strToU8(JSON.stringify({ app: 'test' })), 'file.bin': new Uint8Array([1, 2, 3]) });
    const files = await readZip(new Blob([archive.slice().buffer as ArrayBuffer]));
    expect(readArchiveJson<{ app: string }>(files, 'manifest.json')).toEqual({ app: 'test' });
    expect([...files['file.bin']]).toEqual([1, 2, 3]);
  });
});
