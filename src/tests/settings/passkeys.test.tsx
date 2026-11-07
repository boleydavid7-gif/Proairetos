// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../app/family/Passkey', () => ({
  MakePasskeyNow: () => null,
  usePasskeyStep: () => ({ busy: false, error: '', run: vi.fn() }),
}));

vi.mock('../../app/sync/syncController', () => ({
  addPasskey: vi.fn(),
  forgetPreparedPasskey: vi.fn(),
  letPasskeyOpen: vi.fn(),
  listPasskeys: vi.fn(async () => []),
  passkeyReady: vi.fn(async () => false),
  passkeyWaiting: vi.fn(() => false),
  passkeysAvailable: vi.fn(() => true),
  preparePasskey: vi.fn(),
  removePasskey: vi.fn(),
  restorePasskey: vi.fn(),
}));

describe('shared passkey settings', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('also renders outside Proairetos overlay context', async () => {
    const { Passkeys } = await import('../../features/settings/Passkeys');
    expect(() => render(<Passkeys />)).not.toThrow();
    expect(screen.getByText('Passkeys')).toBeTruthy();
  });
});
