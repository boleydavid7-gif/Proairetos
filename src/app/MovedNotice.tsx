import { useState } from 'react';
import { useNavigate } from './navigationContext';
import { SITE_URL, isOldAddress } from './siteAddress';

/** On the old address only: where the app lives now, and how to bring what is saved here along. */
export default function MovedNotice() {
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(false);
  if (hidden || !isOldAddress()) return null;

  return (
    <div className="storage-notice moved-notice" role="status">
      <p>
        Proairetos now lives at <strong>proairetos.com</strong>. What you saved is kept in this browser at this address,
        so bring it along: back up here, then restore it there under Settings → Back up and restore.
      </p>
      <div className="chip-row">
        <button type="button" className="chip chip--accent" onClick={() => navigate('settings')}>
          Back up here
        </button>
        <a className="chip moved-notice__link" href={SITE_URL}>
          Open proairetos.com
        </a>
        <button type="button" className="button-quiet" onClick={() => setHidden(true)}>
          Later
        </button>
      </div>
    </div>
  );
}
