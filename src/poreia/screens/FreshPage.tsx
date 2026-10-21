import { useEffect, useRef, useState } from 'react';
import { backupService } from '../../app/services';
import { downloadBackup } from '../../data/backup/packing';
import { localDayKey, recordBackup } from '../../data/storage/preferences';
import { Waiting } from '../../lamplight/Waiting';
import type { PoreiaNav } from '../app/App';
import { clearFirstVersion } from '../app/fresh';
import { settings } from '../app/state';

/** Said once: Poreia started over, and the first version's records are cleared (after a copy, if wanted). */
export default function FreshPage({ nav, count }: { nav: PoreiaNav; count: number }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const cleared = useRef(false);

  const clear = () => {
    if (cleared.current) return;
    cleared.current = true;
    void clearFirstVersion();
  };
  // Leaving by any way (back, the bar) clears too: it is said once.
  useEffect(() => clear, []);

  return (
    <div className="page poreia-page">
      <div className="page-top">
        <h1 className="title">Poreia, made new</h1>
      </div>
      <section className="card">
        <p>
          Poreia has been rebuilt from the ground up. The {count === 1 ? 'one record' : `${count} records`} from the first version (trips, time off, bookings) will be cleared from this
          device and your account.
        </p>
        <p className="muted">A copy keeps everything in Proairetos’s backup file, as it is now.</p>
        <div className="button-row">
          <button
            type="button"
            className="button-quiet"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await downloadBackup(await backupService.exportFile(), localDayKey(new Date()));
                recordBackup();
                setSaved(true);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? <Waiting>Saving…</Waiting> : saved ? 'Copy saved' : 'Save a copy first'}
          </button>
          <button
            type="button"
            className="button-main"
            onClick={() => {
              clear();
              nav.swap(settings.load().started ? { name: 'trips' } : { name: 'welcome' });
            }}
          >
            Clear and continue
          </button>
        </div>
      </section>
    </div>
  );
}
