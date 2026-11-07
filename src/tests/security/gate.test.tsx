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
    // Not before both stored copies have been read.
    expect(screen.queryByText('my private screen')).toBeNull();
    await waitFor(() => expect(screen.getByText('my private screen')).toBeTruthy());
    expect(screen.queryByText('Locked')).toBeNull();
  });

  it('hides the app behind the locked screen, and opens it with the account password', async () => {
    const { ErrorBoundary, security } = await load();
    const { setup, envelopes } = await account();
    await security.createFromAccountKey(setup.dataKey, envelopes);
    security.lock();
    render(<ErrorBoundary><p>my private screen</p></ErrorBoundary>);
    await waitFor(() => expect(screen.getByText('Locked')).toBeTruthy());
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
    fireEvent.click(await screen.findByRole('button', { name: 'Use recovery key' }));
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

  /** Every moment the app's own text is in the page, from the first render on. */
  function watchForApp(text: string) {
    const seen: boolean[] = [];
    const look = () => seen.push(document.body.textContent?.includes(text) ?? false);
    const observer = new MutationObserver(look);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return { everShown: () => seen.some(Boolean), stop: () => observer.disconnect(), look };
  }

  it('with the browser-storage copy of the header gone and the database copy valid, never shows the app, and shows locked', async () => {
    const { setup, envelopes } = await account();
    {
      const { security } = await load();
      await security.createFromAccountKey(setup.dataKey, envelopes);
      security.close();
    }
    localStorage.removeItem('proairetosVault');
    vi.resetModules();
    const { ErrorBoundary } = await load();
    const watch = watchForApp('my private screen');
    render(<ErrorBoundary><p>my private screen</p></ErrorBoundary>);
    watch.look();
    expect(screen.queryByText('my private screen')).toBeNull();
    await waitFor(() => expect(screen.getByText('Locked')).toBeTruthy());
    watch.stop();
    expect(watch.everShown()).toBe(false);
    expect(localStorage.getItem('proairetosVault')).not.toBeNull();
  });

  it('with browser storage refusing to be read, never shows the app and says it cannot check; Try again then opens the app', async () => {
    vi.resetModules();
    const { ErrorBoundary } = await load();
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    const watch = watchForApp('my private screen');
    try {
      render(<ErrorBoundary><p>my private screen</p></ErrorBoundary>);
      watch.look();
      await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/cannot be checked/));
      expect(screen.queryByText('my private screen')).toBeNull();
    } finally {
      spy.mockRestore();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText('my private screen')).toBeTruthy());
    watch.stop();
    expect(watch.everShown()).toBe(true);
  });

  it('with the vault’s database failing to open and nothing in browser storage, fails closed', async () => {
    vi.resetModules();
    const { ErrorBoundary } = await load();
    const original = indexedDB.open.bind(indexedDB);
    const spy = vi.spyOn(indexedDB, 'open').mockImplementation(((name: string, version?: number) => {
      if (name === 'proairetos-vault') {
        const request = {} as IDBOpenDBRequest;
        setTimeout(() => {
          Object.defineProperty(request, 'error', { value: new DOMException('blocked', 'UnknownError') });
          (request as { onerror?: (event: Event) => void }).onerror?.(new Event('error'));
        }, 0);
        return request;
      }
      return original(name, version);
    }) as typeof indexedDB.open);
    try {
      render(<ErrorBoundary><p>my private screen</p></ErrorBoundary>);
      await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/cannot be checked/));
      expect(screen.queryByText('my private screen')).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });

  it('with both copies damaged, never shows the app and removes nothing', async () => {
    localStorage.setItem('proairetosVault', 'garbage');
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open('proairetos-vault', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('header');
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve) => {
      const tx = db.transaction('header', 'readwrite');
      tx.objectStore('header').put('also garbage', 'header');
      tx.oncomplete = () => resolve();
    });
    db.close();
    vi.resetModules();
    const { ErrorBoundary } = await load();
    const watch = watchForApp('my private screen');
    render(<ErrorBoundary><p>my private screen</p></ErrorBoundary>);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/could not be read/));
    watch.stop();
    expect(watch.everShown()).toBe(false);
    expect(localStorage.getItem('proairetosVault')).toBe('garbage');
  });
});
