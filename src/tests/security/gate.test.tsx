// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createKeys } from '../../data/sync/keys';
import type { AccountEnvelopes } from '../../data/security/vault';

/* What every app shows: its own screens with no vault, and the locked screen, in every app, while a vault is locked. */
const PASS = 'a long passphrase for tests';

beforeEach(async () => {
  localStorage.clear();
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase('proairetos-vault');
    request.onsuccess = request.onerror = request.onblocked = () => resolve();
  });
  vi.resetModules();
});
afterEach(cleanup);

async function load() {
  const { default: ErrorBoundary } = await import('../../app/ErrorBoundary');
  const { security } = await import('../../app/security/securityService');
  return { ErrorBoundary, security };
}

async function account() {
  const setup = await createKeys(PASS);
  const envelopes: AccountEnvelopes = { userId: 'u1', passphrase: setup.passphraseWrap, recovery: setup.recoveryWrap, passkeys: [] };
  return { setup, envelopes };
}

describe('the lock in front of every app', () => {
  it('shows the app untouched when there is no vault', async () => {
    const { ErrorBoundary } = await load();
    render(<ErrorBoundary><p>my private screen</p></ErrorBoundary>);
    expect(screen.getByText('my private screen')).toBeTruthy();
    expect(screen.queryByText('Locked')).toBeNull();
  });

  it('hides the app behind the locked screen, and opens it with the account password', async () => {
    const { ErrorBoundary, security } = await load();
    const { setup, envelopes } = await account();
    await security.createFromAccountKey(setup.dataKey, envelopes);
    security.lock();
    render(<ErrorBoundary><p>my private screen</p></ErrorBoundary>);
    expect(screen.getByText('Locked')).toBeTruthy();
    expect(screen.queryByText('my private screen')).toBeNull();

    fireEvent.change(screen.getByLabelText('Account password'), { target: { value: 'not the password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/does not unlock your data/));
    expect(screen.queryByText('my private screen')).toBeNull();

    fireEvent.change(screen.getByLabelText('Account password'), { target: { value: PASS } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    await waitFor(() => expect(screen.getByText('my private screen')).toBeTruthy());
  });

  it('opens with the recovery key', async () => {
    const { ErrorBoundary, security } = await load();
    const { setup, envelopes } = await account();
    await security.createFromAccountKey(setup.dataKey, envelopes);
    security.lock();
    render(<ErrorBoundary><p>my private screen</p></ErrorBoundary>);
    fireEvent.click(screen.getByRole('button', { name: 'Use recovery key' }));
    fireEvent.change(screen.getByLabelText('Recovery key'), { target: { value: setup.recoveryKey } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    await waitFor(() => expect(screen.getByText('my private screen')).toBeTruthy());
  });

  it('shows the locked screen at once, before the stored header has been read, when a vault is known to exist', async () => {
    const { setup, envelopes } = await account();
    {
      const { security } = await load();
      await security.createFromAccountKey(setup.dataKey, envelopes);
      security.close();
    }
    vi.resetModules();
    const { ErrorBoundary } = await load();
    render(<ErrorBoundary><p>my private screen</p></ErrorBoundary>);
    // First paint: locked, never the app.
    expect(screen.queryByText('my private screen')).toBeNull();
    expect(screen.getByText('Locked')).toBeTruthy();
  });

  it('says plainly when the security data cannot be read, and shows no app', async () => {
    localStorage.setItem('proairetosVault', '{"v":1}');
    const { ErrorBoundary } = await load();
    render(<ErrorBoundary><p>my private screen</p></ErrorBoundary>);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/could not be read/));
    expect(screen.queryByText('my private screen')).toBeNull();
    expect(localStorage.getItem('proairetosVault')).toBe('{"v":1}');
  });
});
