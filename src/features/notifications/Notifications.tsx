import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { clearEntries, markSeen, startInbox, unclearEntries, useInbox } from '../../app/notify/inbox';
import { useNoticeOpen } from '../../app/notify/NoticeOpener';
import { useBackHandler } from '../../app/back/backStack';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { useNavigate } from '../../app/navigationContext';
import { familyApps } from '../../app/family/FamilyApps';
import { openSettingsAt } from '../settings/settingsViews';
import { agoText, byApp, type InboxEntry } from '../../core/notify/inbox';
import type { FamilyApp } from '../../core/notify/sources';
import { IconButton, Sym } from '../../lamplight/icons';
import { attention, onAttention, type Attention } from '../../lamplight/attention';
import { BellIcon } from '../../components/icons/Icons';
import SwipeItem from '../../app/family/SwipeItem';

const APP_NAMES: Partial<Record<FamilyApp, string>> = { proairetos: 'Proairetos' };
const nameOf = (app: FamilyApp) => APP_NAMES[app] ?? familyApps.find((each) => each.id === app)?.name ?? app;
const iconOf = (app: FamilyApp) => (app === 'proairetos' ? '/favicon.svg' : familyApps.find((each) => each.id === app)?.icon ?? '/favicon.svg');

/** The person's choice of what may ask for attention on Today (Settings > Attention). */
function useAttention(): Attention {
  const key = useSyncExternalStore(onAttention, () => JSON.stringify(attention()));
  return JSON.parse(key) as Attention;
}

/** The bell on Today: how many came in since the list was last opened, and the fly-out list itself. */
export function NotificationsButton() {
  const { unseen } = useInbox();
  const [open, setOpen] = useState(false);
  useEffect(() => startInbox(), []);
  const { bell } = useAttention();
  const count = bell === 'off' ? 0 : unseen.length;
  // A dot is a blank badge (a space, so the top bar's copy keeps it); the number caps at 9+.
  const badge = !count ? undefined : bell === 'dot' ? ' ' : count > 9 ? '9+' : String(count);
  return (
    <>
      <IconButton
        label={!count ? 'Notifications' : bell === 'dot' ? 'Notifications, new' : `Notifications, ${count} new`}
        className="header-action inbox-bell"
        data-badge={badge}
        onClick={() => setOpen(true)}
      >
        <BellIcon size={22} />
      </IconButton>
      {/* On the page's body, so the top bar (which copies the header's buttons) never picks up the list's own. */}
      {open && createPortal(<InboxFlyout onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

/** Opens the list from elsewhere on Today (the important card's Review). */
export const openInbox = () => document.querySelector<HTMLButtonElement>('.page-header .inbox-bell')?.click();

const CLOSE_MS = 180;

/**
 * The list, flying out from the bell: one stack per app like a phone's notification centre. A stack opens to show
 * all of its app's entries; each app clears on its own, and Clear all takes everything (with undo).
 */
function InboxFlyout({ onClose }: { onClose: () => void }) {
  const { entries } = useInbox();
  const open = useNoticeOpen();
  const navigate = useNavigate();
  const { offerUndo } = useOverlays();
  const dialog = useRef<HTMLDialogElement>(null);
  const [expanded, setExpanded] = useState<FamilyApp | null>(null);
  const closing = useRef(false);

  const close = (then?: () => void) => {
    const element = dialog.current;
    if (!element || closing.current) return;
    closing.current = true;
    element.classList.add('inbox--closing');
    window.setTimeout(() => {
      element.close();
      onClose();
      then?.();
    }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : CLOSE_MS);
  };
  useBackHandler(true, () => close());

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    // Where the bell is, so the list grows out of it.
    const bells = [...document.querySelectorAll<HTMLElement>('.ll-topbar__action, .page-header .inbox-bell')].filter((each) => each.getAttribute('aria-label')?.startsWith('Notifications'));
    const box = bells.filter((each) => getComputedStyle(each).visibility !== 'hidden').map((each) => each.getBoundingClientRect()).find((rect) => rect.width > 0);
    if (element && box) {
      // Kept on screen: as wide as fits, its right edge under the bell where there is room, growing out of the bell.
      const width = Math.min(380, window.innerWidth - 24);
      const right = Math.min(Math.max(12, Math.round(window.innerWidth - box.right)), window.innerWidth - width - 12);
      const left = window.innerWidth - right - width;
      element.style.setProperty('--inbox-top', `${Math.round(box.bottom + 8)}px`);
      element.style.setProperty('--inbox-right', `${right}px`);
      element.style.setProperty('--inbox-width', `${width}px`);
      element.style.setProperty('--inbox-origin', `${Math.round(box.left + box.width / 2 - left)}px 0`);
    }
    const cancel = (event: Event) => {
      event.preventDefault();
      close();
    };
    element?.addEventListener('cancel', cancel);
    return () => element?.removeEventListener('cancel', cancel);
  }, []);

  // What is open has been seen: the bell's count goes.
  useEffect(() => markSeen(entries.map((entry) => entry.key)), [entries]);

  const groups = byApp(entries);
  const clear = (list: readonly InboxEntry[], words: string) => {
    const keys = list.map((entry) => entry.key);
    clearEntries(keys);
    offerUndo(words, async () => unclearEntries(keys));
  };
  const follow = (entry: InboxEntry) => {
    clearEntries([entry.key]);
    close(() => open(entry.open));
  };

  return (
    <dialog ref={dialog} className="inbox" aria-label="Notifications" onClick={(event) => event.target === dialog.current && close()}>
      <div className="inbox__panel">
        <header className="inbox__head">
          <h2 className="inbox__title">Notifications</h2>
          <div className="inbox__head-actions">
            {entries.length > 0 && (
              <button type="button" className="inbox__clear-all" onClick={() => clear(entries, 'Notifications cleared')}>
                Clear all
              </button>
            )}
            <IconButton
              label="Notification settings"
              size="sm"
              onClick={() =>
                close(() => {
                  openSettingsAt('notifications');
                  navigate('settings');
                })
              }
            >
              <Sym name="gear" size={20} />
            </IconButton>
            <IconButton label="Close" size="sm" onClick={() => close()}>
              <Sym name="close" size={20} />
            </IconButton>
          </div>
        </header>
        {groups.length === 0 ? (
          <p className="inbox__empty" role="status">
            No notifications
          </p>
        ) : (
          <ul className="inbox__groups">
            {groups.map(({ app, entries: list }) => {
              const isOpen = expanded === app || list.length === 1;
              return (
                <li key={app} className={`inbox-group${isOpen ? ' is-open' : ''}${list.length > 1 ? ' is-stack' : ''}`}>
                  <div className="inbox-group__head">
                    <span className="inbox-group__app">{nameOf(app)}</span>
                    {expanded === app && list.length > 1 && (
                      <button type="button" className="inbox-group__less" onClick={() => setExpanded(null)}>
                        Show less
                      </button>
                    )}
                    <IconButton label={`Clear ${nameOf(app)}`} size="sm" className="inbox-group__clear" onClick={() => clear(list, `${nameOf(app)} cleared`)}>
                      <Sym name="close" size={16} />
                    </IconButton>
                  </div>
                  {isOpen ? (
                    <ul className="inbox-group__list">
                      {list.map((entry, index) => (
                        <li key={entry.key} style={{ '--i': index } as CSSProperties}>
                          <SwipeItem as="div" className="inbox-swipe" tone="remove" label="Clear" onSwipe={() => clear([entry], 'Notification cleared')}>
                            <Card entry={entry} app={app} onOpen={() => follow(entry)} />
                          </SwipeItem>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <SwipeItem as="div" className="inbox-swipe" tone="remove" label="Clear" onSwipe={() => clear(list, `${nameOf(app)} cleared`)}>
                      <button type="button" className="inbox-stack" aria-expanded={false} aria-label={`${nameOf(app)}, ${list.length} notifications`} onClick={() => setExpanded(app)}>
                        <Card entry={list[0]} app={app} more={list.length - 1} />
                        <span className="inbox-stack__layer inbox-stack__layer--1" aria-hidden="true" />
                        {list.length > 2 && <span className="inbox-stack__layer inbox-stack__layer--2" aria-hidden="true" />}
                      </button>
                    </SwipeItem>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </dialog>
  );
}

function Card({ entry, app, more, onOpen }: { entry: InboxEntry; app: FamilyApp; more?: number; onOpen?: () => void }) {
  const now = new Date();
  const inner = (
    <>
      <img className="inbox-card__icon" src={iconOf(app)} alt="" width={36} height={36} />
      <span className="inbox-card__text">
        <span className="inbox-card__top">
          <span className="inbox-card__title">{entry.title}</span>
          <span className="inbox-card__when">{agoText(entry.at, now)}</span>
        </span>
        <span className="inbox-card__body">{entry.body}</span>
        {more ? <span className="inbox-card__more">{more} more</span> : null}
      </span>
    </>
  );
  return onOpen ? (
    <button type="button" className="inbox-card" onClick={onOpen}>
      {inner}
    </button>
  ) : (
    <span className="inbox-card">{inner}</span>
  );
}

/** Today's card for what matters now: shown only while there is something, cleared with its ×. */
export function ImportantCard() {
  const { important } = useInbox();
  const { offerUndo } = useOverlays();
  const { updates } = useAttention();
  useEffect(() => startInbox(), []);
  if (important.length === 0 || !updates) return null;
  const first = important[0];
  const keys = important.map((entry) => entry.key);
  return (
    <section className="important-card" aria-label="Important">
      <span className="important-card__icon" aria-hidden="true">
        <Sym name={first.kind === 'schedule-change' ? 'calendar' : first.kind === 'bill' ? 'bills' : first.kind === 'care' ? 'pill' : first.kind === 'household' ? 'people' : 'plane'} size={22} />
      </span>
      <div className="important-card__text">
        <p className="important-card__count">{important.length === 1 ? '1 important update' : `${important.length} important updates`}</p>
        <p className="important-card__title">{first.title}</p>
        <p className="important-card__body">{first.body}</p>
      </div>
      <button type="button" className="important-card__review" onClick={openInbox}>
        Review
      </button>
      <IconButton
        label="Clear"
        size="sm"
        className="important-card__clear"
        onClick={() => {
          clearEntries(keys);
          offerUndo(important.length === 1 ? 'Update cleared' : 'Updates cleared', async () => unclearEntries(keys));
        }}
      >
        <Sym name="close" size={18} />
      </IconButton>
    </section>
  );
}
