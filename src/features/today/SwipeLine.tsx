import { createContext, useContext, type ReactNode } from 'react';
import { useOverlays } from '../../app/overlays/OverlayContext';
import SwipeItem from '../../app/family/SwipeItem';
import { bringBack, doneHere, setAside, undoDoneHere, useTodayMarks } from '../../app/family/notToday';
import { MoonIcon } from '../../app/family/icons';

/** The person's today for the lines in Today's From your apps group; outside it (the Lighter view) lines do not swipe. */
export const SwipeDay = createContext<string | undefined>(undefined);

/**
 * One line of From your apps that pulls both ways: left is done (marked in its own app when `mark` is given, else done
 * here for the day), right is Not today. Both offer undo. A line done or set aside today is not shown.
 */
export default function SwipeLine({
  id,
  title,
  mark,
  doneWord = 'Done',
  children,
}: {
  id: string;
  title: string;
  /** Marks it in its own app and gives back the undo. */
  mark?: () => () => void;
  doneWord?: string;
  children: ReactNode;
}) {
  const today = useContext(SwipeDay);
  const marks = useTodayMarks(today ?? '');
  const { offerUndo } = useOverlays();
  if (!today) return <div className="quiet-row-wrap">{children}</div>;
  if (marks.aside.includes(id) || marks.done.includes(id)) return null;
  return (
    <SwipeItem
      as="div"
      className="quiet-row-wrap"
      label={doneWord}
      onSwipe={() => {
        if (mark) {
          const undo = mark();
          offerUndo(`“${title}” ${doneWord.toLowerCase()}`, async () => undo());
        } else {
          doneHere(today, id);
          offerUndo(`“${title}” done`, async () => undoDoneHere(today, id));
        }
      }}
      later={{
        label: 'Not today',
        onSwipe: () => {
          setAside(today, id, title);
          offerUndo(`“${title}” not today`, async () => bringBack(today, id));
        },
      }}
    >
      {children}
    </SwipeItem>
  );
}

/** What was set aside today, folded into one line at the foot of the group; each can come back. */
export function NotTodayFold() {
  const today = useContext(SwipeDay);
  const marks = useTodayMarks(today ?? '');
  if (!today || !marks.aside.length) return null;
  return (
    <details className="quiet-row-wrap from-apps__aside">
      <summary className="quiet-row">
        <span className="quiet-row__icon" aria-hidden="true">
          <MoonIcon size={20} />
        </span>
        <span className="quiet-row__text">
          <span>Not today · {marks.aside.length}</span>
        </span>
      </summary>
      <ul className="from-apps__aside-list">
        {marks.aside.map((key) => (
          <li key={key}>
            <span>{marks.titles[key] ?? 'Set aside'}</span>
            <button type="button" className="text-link" onClick={() => bringBack(today, key)}>
              Bring back
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
