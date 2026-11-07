import { useState, type ReactNode } from 'react';
import { Sym } from '../../lamplight/icons';
import './moreDetails.css';

/**
 * The optional fields of an add form, folded: a new thing needs only its name (and the one field that makes it
 * work), the rest waits under "More details". Opens by itself when editing something that already has any of them.
 */
export default function MoreDetails({ open = false, children, label = 'More details' }: { open?: boolean; children: ReactNode; label?: string }) {
  const [shown, setShown] = useState(open);
  return (
    <div className={`more-details${shown ? ' is-open' : ''}`}>
      <button type="button" className="more-details__toggle" aria-expanded={shown} onClick={() => setShown(!shown)}>
        <span>{label}</span>
        <Sym name="chevron" size={18} className="more-details__chevron" />
      </button>
      {shown && <div className="more-details__body">{children}</div>}
    </div>
  );
}
