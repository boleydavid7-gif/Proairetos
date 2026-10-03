import { useSyncExternalStore } from 'react';
import { syncStatus } from '../sync/syncController';

/**
 * The account is Proairetos's: signing in there signs in Askesis and SOMA
 * too, with the same key. Shown at the top of their More pages.
 */
export default function AccountCard({ app, what, waiting }: { app: string; what: string; waiting: string }) {
  const account = useSyncExternalStore(syncStatus.subscribe, syncStatus.get);
  const synced = account.lastSyncedAt
    ? new Date(account.lastSyncedAt).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
    : undefined;
  const [title, detail, link] =
    account.phase === 'ready'
      ? [
          account.email ?? 'Signed in',
          account.held ? `${waiting} wait on this phone until the server is updated.` : `${what} sync with Proairetos${synced ? `. Last ${synced}` : ''}.`,
          false,
        ]
      : account.phase === 'signed-out'
        ? ['Not signed in', `Sign in once in Proairetos and it covers ${app} too.`, true]
        : account.phase === 'locked' || account.phase === 'needs-setup'
          ? ['Signed in', `Finish setting up sync in Proairetos, then it covers ${app} too.`, true]
          : ['On this phone', 'Everything stays on this phone.', false];
  const body = (
    <>
      <span className="row__icon">
        <img className="row__app" src="/icons/icon.svg" alt="" width={26} height={26} />
      </span>
      <span className="row__text">
        <span>{title}</span>
        <span className="row__detail">{detail}</span>
      </span>
      {link && (
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden="true">
          <path d="m9 6 6 6-6 6" />
        </svg>
      )}
    </>
  );
  return (
    <section className="rows account" aria-label="Account">
      {link ? (
        <a className="row" href="/">
          {body}
        </a>
      ) : (
        <div className="row">{body}</div>
      )}
    </section>
  );
}
