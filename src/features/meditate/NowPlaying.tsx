import { useSyncExternalStore } from 'react';
import { player } from '../../app/sound/player';
import { soundEntry } from '../../app/sound/soundscapes';
import { StopIcon } from '../../components/icons/Icons';

/** What is playing, shown away from Meditate so it can be stopped from anywhere. */
export default function NowPlaying({ onOpen, raised }: { onOpen: () => void; raised: boolean }) {
  const state = useSyncExternalStore(player.subscribe, player.state);
  const titles = [soundEntry(state.sound)?.title, soundEntry(state.music)?.title].filter(Boolean);
  if (titles.length === 0) return null;
  return (
    <div className={`now-playing${raised ? ' now-playing--raised' : ''}`}>
      <button type="button" className="now-playing__label" onClick={onOpen}>
        <span className="sound-list__bars" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>{titles.join(' · ')}</span>
      </button>
      <button type="button" className="now-playing__stop" aria-label="Stop playing" onClick={() => player.stop()}>
        <StopIcon size={18} />
      </button>
    </div>
  );
}
