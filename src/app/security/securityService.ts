/**
 * The one security service for every app in the family: it keeps the Local Vault Key, locks and unlocks it, and shares
 * the unlocked state between the pages open in this browser (Proairetos and its companion apps).
 *
 * - **No vault yet:** the phase is `none` and nothing about the app changes. Nothing creates a vault in this release;
 *   it is built, tested and waiting for Stage 3 (sealing the records).
 * - **Locked:** a vault exists and no page holds its key. Unlocking uses what people already have: the account
 *   password, a passkey or the recovery key (`data/sync/keys.ts`), against the account's wrapped keys kept in the vault
 *   header, so it needs no connection.
 * - **Unlocked:** the key lives in memory only (never in a database), as a key that cannot be exported.
 * - **Sharing:** unlocking in one page gives the same key object to the other open pages over a `BroadcastChannel` (a key
 *   object can be passed between pages of one origin without its bytes being exposed), and locking tells them all to drop
 *   it. A page that opens while another is unlocked asks for the key. If a browser cannot pass a key, the page simply
 *   stays locked and asks the person.
 * - **Session:** the sync controller locks the vault whenever it forgets the account key (sign-out, a session that ended,
 *   a revoked device) and offers the account key when it has it.
 */
import { createListeners } from '../../services/listeners';
import { KeyError, unlockWithPasskey, unlockWithPassphrase, unlockWithRecoveryKey } from '../../data/sync/keys';
import { LockedError } from '../../data/security/locked';
import { createVault, isVaultKey, openVault, VaultError, withAccount, type AccountEnvelopes, type VaultHeader } from '../../data/security/vault';
import { createVaultStorage, indexedDbHeader, localStorageHeader, type VaultLoad, type VaultStorage } from '../../data/security/vaultStorage';

/**
 * - `checking`: the stored copies have not been read yet. Nothing private is shown.
 * - `none`: both places were read and there is no vault.
 * - `unverified`: a vault may exist but storage could not be read to tell. Fails closed: nothing private is shown.
 */
export type SecurityPhase = 'checking' | 'none' | 'unverified' | 'locked' | 'unlocked' | 'corrupt';

export type SecurityStatus = {
  phase: SecurityPhase;
  /** The account the vault belongs to, once known. */
  userId?: string;
  /** The passkeys that can open it (credential ids). */
  passkeys: readonly string[];
  /** Whether an account password can open it (an account set up with only a passkey has none). */
  hasPassphrase: boolean;
};

type Message =
  | { t: 'ask' }
  | { t: 'lock'; vault: string }
  | { t: 'key'; vault: string; key: CryptoKey }
  | { t: 'created' };

export type SecurityDeps = {
  storage: VaultStorage;
  openChannel: () => BroadcastChannel | null;
  /** One page at a time for creating the vault (Web Locks); a plain call where the browser has none. */
  exclusive: <T>(task: () => Promise<T>) => Promise<T>;
  now: () => Date;
  /** Whether a vault is known to exist before anything has loaded (read synchronously). Only ever speeds up showing the locked screen. */
  vaultKnown: () => boolean;
  /** How long reading the stored copies may take before the answer is "could not verify". */
  checkTimeoutMs: number;
};

export function createSecurityService(deps: SecurityDeps) {
  const listeners = createListeners();
  let header: VaultHeader | null = null;
  let lvk: CryptoKey | null = null;
  let channel: BroadcastChannel | null = null;
  let starting: Promise<void> | null = null;
  // What the stored copies say. Until both have been read it is `checking` (or `vault`, if one is already known to exist):
  // an empty browser-storage copy never proves there is no vault, so a page is never `none` before it has looked at both.
  let verdict: 'checking' | 'none' | 'unverified' | 'corrupt' | 'vault' = deps.vaultKnown() ? 'vault' : 'checking';
  let phase: SecurityPhase = 'checking';
  let snapshot: SecurityStatus = { phase: 'checking', passkeys: [], hasPassphrase: false };

  function publish() {
    phase = lvk ? 'unlocked' : verdict === 'corrupt' ? 'corrupt' : header || verdict === 'vault' ? 'locked' : verdict;
    snapshot = {
      phase,
      userId: header?.account.userId,
      passkeys: header?.account.passkeys.map((row) => row.credentialId) ?? [],
      hasPassphrase: Boolean(header?.account.passphrase),
    };
    listeners.notify();
  }

  // The first snapshot already says `locked` or `checking`: no page paints a private screen first.
  publish();

  function post(message: Message) {
    try {
      channel?.postMessage(message);
    } catch {
      // A browser that cannot pass a key between pages: the others stay locked and ask the person.
    }
  }

  async function adopt(key: CryptoKey, share: boolean) {
    lvk = key;
    publish();
    if (share && header) post({ t: 'key', vault: header.id, key });
  }

  /** Reads both stored copies. Not being able to tell is `unverified`, and a read that takes too long counts as not being able to tell. */
  async function reload() {
    let loaded: VaultLoad;
    try {
      loaded = await Promise.race([
        deps.storage.load(),
        new Promise<VaultLoad>((resolve) => setTimeout(() => resolve({ state: 'unverified' }), deps.checkTimeoutMs)),
      ]);
    } catch {
      loaded = { state: 'unverified' };
    }
    if (loaded.state === 'ok') {
      header = loaded.header;
      verdict = 'vault';
    } else if (loaded.state === 'unverified') {
      // A page that already knows its vault keeps what it knows; one that has no answer fails closed.
      if (!header) {
        lvk = null;
        verdict = 'unverified';
      }
    } else if (loaded.state === 'corrupt') {
      header = null;
      lvk = null;
      verdict = 'corrupt';
    } else {
      header = null;
      lvk = null;
      verdict = 'none';
    }
    publish();
  }

  async function onMessage(message: Message) {
    if (message.t === 'ask') {
      if (lvk && header) post({ t: 'key', vault: header.id, key: lvk });
    } else if (message.t === 'lock') {
      if (header && message.vault === header.id) {
        lvk = null;
        publish();
      }
    } else if (message.t === 'key') {
      if (!lvk && header && header.id === message.vault && typeof message.key === 'object' && message.key !== null && (await isVaultKey(header, message.key))) await adopt(message.key, false);
    } else if (message.t === 'created') {
      await reload();
      if (phase === 'locked') post({ t: 'ask' });
    }
  }

  function start(): Promise<void> {
    starting ??= (async () => {
      await reload();
      channel = deps.openChannel();
      channel?.addEventListener('message', (event: MessageEvent<Message>) => void onMessage(event.data));
      if (phase === 'locked') post({ t: 'ask' });
    })();
    return starting;
  }

  const needHeader = (): VaultHeader => {
    if (!header) throw new VaultError('corrupt', 'There is no vault on this device.');
    return header;
  };

  async function unlockWith(accountKey: CryptoKey): Promise<void> {
    const current = needHeader();
    try {
      await adopt(await openVault(current, accountKey), true);
    } catch (cause) {
      if (cause instanceof VaultError && cause.code === 'corrupt') {
        verdict = 'corrupt';
        publish();
      }
      throw cause;
    }
  }

  return {
    status: () => snapshot,
    subscribe: listeners.subscribe,
    start,

    /** The key for sealing and opening local data; a `LockedError` while the vault is locked or there is none. */
    key(): CryptoKey {
      if (!lvk) throw new LockedError();
      return lvk;
    },

    /** Makes the vault for this device (once; a second page finding one just unlocks it). Nothing calls this in this release. */
    async createFromAccountKey(accountKey: CryptoKey, account: AccountEnvelopes): Promise<void> {
      await start();
      await deps.exclusive(async () => {
        await reload();
        // Never make a vault over something that could not be read or is damaged: a vault may already be there.
        if (phase === 'unverified') throw new VaultError('unverified', 'The security data on this device cannot be checked right now.');
        if (phase === 'corrupt') throw new VaultError('corrupt', 'The security data on this device could not be read.');
        if (header) return unlockWith(accountKey);
        const made = await createVault(accountKey, account, deps.now());
        await deps.storage.save(made.header);
        header = made.header;
        await adopt(made.lvk, true);
        post({ t: 'created' });
      });
    },

    /** The account key is open (the sync controller has it): open the vault with it. No effect where there is no vault. */
    async unlockWithAccountKey(accountKey: CryptoKey): Promise<void> {
      await start();
      if (header && !lvk) await unlockWith(accountKey);
    },

    async unlockWithPassphrase(passphrase: string): Promise<void> {
      await start();
      const current = needHeader();
      if (!current.account.passphrase) throw new KeyError('This account has no account password. Use your passkey or recovery key.');
      await unlockWith(await unlockWithPassphrase(current.account.passphrase, passphrase));
    },

    async unlockWithRecoveryKey(recoveryKey: string): Promise<void> {
      await start();
      await unlockWith(await unlockWithRecoveryKey(needHeader().account.recovery, recoveryKey));
    },

    /** `secret` is what the passkey gave (`askForPasskey`). */
    async unlockWithPasskey(credentialId: string, secret: Uint8Array<ArrayBuffer>): Promise<void> {
      await start();
      const row = needHeader().account.passkeys.find((each) => each.credentialId === credentialId);
      if (!row) throw new KeyError('That passkey does not open the data on this device. Use your account password or recovery key.');
      await unlockWith(await unlockWithPasskey(row.wrap, secret));
    },

    /** Forgets the key here and in every open page. The vault and everything sealed stay as they are. */
    lock(): void {
      if (!header && !lvk) return;
      lvk = null;
      if (header) post({ t: 'lock', vault: header.id });
      publish();
    },

    /** Newer copies of the account's wrapped keys (a new passphrase, a new passkey). They are not secret; the vault may be locked. */
    async rememberAccount(account: AccountEnvelopes): Promise<void> {
      await start();
      if (!header || JSON.stringify(header.account) === JSON.stringify(account)) return;
      const next = withAccount(header, account, deps.now());
      await deps.storage.save(next);
      header = next;
      publish();
    },

    /** Looks at the stored copies again (after the screen that says they could not be checked). */
    async retry(): Promise<void> {
      await start();
      await reload();
      if (phase === 'locked' && !lvk) post({ t: 'ask' });
    },

    /** For tests and shutdown. */
    close(): void {
      channel?.close();
      channel = null;
    },
  };
}

export type SecurityService = ReturnType<typeof createSecurityService>;

function defaultDeps(): SecurityDeps {
  return {
    storage: createVaultStorage(localStorageHeader(), indexedDbHeader()),
    openChannel: () => (typeof BroadcastChannel === 'function' ? new BroadcastChannel('proairetos-security') : null),
    exclusive: (task) => (typeof navigator !== 'undefined' && navigator.locks ? navigator.locks.request('proairetos-vault', task) : task()),
    now: () => new Date(),
    vaultKnown: () => localStorageHeader().exists(),
    checkTimeoutMs: 4000,
  };
}

/** The service every app uses. */
export const security = createSecurityService(defaultDeps());

/** Whether a vault exists, known at once from browser storage (before anything has loaded). */
export function vaultExistsHere(): boolean {
  return localStorageHeader().exists();
}
