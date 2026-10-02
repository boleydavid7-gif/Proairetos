import { useEffect, useState } from 'react';
import { useNavigate } from '../../app/navigationContext';
import { syncStatus } from '../../app/sync/syncController';
import QuietOffer from '../../components/ui/QuietOffer';
import { backupWorthOffering } from '../../core/rhythm/backupOffer';
import { hideOffer, lastBackupDate, takeOffer } from '../../data/storage/preferences';
import { openSettingsAt } from '../settings/SettingsPage';

/** Now and then, without sync, a quiet offer to save a backup. One of the day's offers at most. */
export default function BackupOffer({ today, recordCount }: { today: string; recordCount: number }) {
  const navigate = useNavigate();
  const [showing, setShowing] = useState(false);
  const [decided, setDecided] = useState(false);

  useEffect(() => {
    if (decided || recordCount === 0) return;
    setDecided(true);
    const worth = backupWorthOffering({
      syncing: syncStatus.get().phase === 'ready',
      recordCount,
      lastBackup: lastBackupDate(),
      now: new Date(),
    });
    if (worth && takeOffer('backup', today)) setShowing(true);
  }, [decided, recordCount, today]);

  if (!showing) return null;
  return (
    <QuietOffer
      text="Save a backup of what you have here"
      onAccept={() => {
        setShowing(false);
        openSettingsAt('backup');
        navigate('settings');
      }}
      onNotForMe={() => {
        hideOffer('backup');
        setShowing(false);
      }}
      onDismiss={() => setShowing(false)}
    />
  );
}
