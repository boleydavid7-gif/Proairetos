type Props = {
  text: string;
  onAccept: () => void;
  /** Hides this kind of offer for good. */
  onNotForMe: () => void;
  onDismiss: () => void;
};

/** One line, offered once. Ignoring it is a complete answer. */
export default function QuietOffer({ text, onAccept, onNotForMe, onDismiss }: Props) {
  return (
    <div className="quiet-offer" role="status">
      <button type="button" className="quiet-offer__accept" onClick={onAccept}>
        {text}
      </button>
      <span className="quiet-offer__actions">
        <button type="button" className="quiet-offer__quiet" onClick={onNotForMe}>
          Not for me
        </button>
        <button type="button" className="quiet-offer__quiet" aria-label="Dismiss" onClick={onDismiss}>
          ×
        </button>
      </span>
    </div>
  );
}
