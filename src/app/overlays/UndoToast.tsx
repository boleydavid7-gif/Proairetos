import { useEffect } from 'react';

type Props = {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
};

const VISIBLE_MS = 6000;

export default function UndoToast({ message, onUndo, onDismiss }: Props) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="toast" role="status" aria-live="polite">
      <span>{message}</span>
      <button type="button" className="toast__action" onClick={onUndo}>
        Undo
      </button>
    </div>
  );
}
